from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from django.utils import timezone

try:
    from scapy.layers.inet import IP, TCP, UDP
    from scapy.layers.l2 import Ether
    from scapy.packet import Raw
except ImportError:  # pragma: no cover - entorno sin scapy
    IP = TCP = UDP = Ether = Raw = None  # type: ignore
    SCAPY_AVAILABLE = False
else:
    SCAPY_AVAILABLE = True


class CaptureUnavailable(RuntimeError):
    """Se lanza cuando Scapy no está disponible en el entorno."""


@dataclass(frozen=True)
class FlowKey:
    direction: str
    src_ip: str
    dst_ip: str
    src_port: Optional[int]
    dst_port: Optional[int]
    protocol: str


@dataclass
class FlowAccumulator:
    src_mac: str = ""
    dst_mac: str = ""
    packets: int = 0
    bytes: int = 0
    flag_syn: bool = False
    flag_fin: bool = False
    flag_rst: bool = False
    ttl_total: float = 0.0
    ttl_count: int = 0
    payload_sample: str = ""
    tcp_window_total: int = 0
    tcp_window_count: int = 0
    tcp_options: Set[str] = field(default_factory=set)
    tcp_mss: Optional[int] = None

    def ttl_promedio(self) -> Optional[int]:
        if not self.ttl_count:
            return None
        return int(round(self.ttl_total / self.ttl_count))

    def tcp_window_promedio(self) -> Optional[int]:
        if not self.tcp_window_count:
            return None
        return int(round(self.tcp_window_total / self.tcp_window_count))

    def opciones_texto(self) -> str:
        if not self.tcp_options:
            return ""
        return ",".join(sorted(self.tcp_options))


@dataclass
class FlowRecord:
    key: FlowKey
    accumulator: FlowAccumulator
    ventana_inicio: datetime
    ventana_fin: datetime


class FlowAggregator:
    """Agrupa paquetes en ventanas temporales y genera registros listos para persistir."""

    def __init__(
        self,
        window_seconds: int = 10,
        local_ips: Optional[Sequence[str]] = None,
        local_macs: Optional[Sequence[str]] = None,
    ) -> None:
        if not SCAPY_AVAILABLE:
            raise CaptureUnavailable("Scapy no está instalado; no se puede capturar tráfico.")

        self.window_seconds = max(window_seconds, 1)
        self.local_ips: Set[str] = set(local_ips or [])
        self.local_macs: Set[str] = {mac.lower() for mac in (local_macs or []) if mac}

        self._current_window_start: Optional[datetime] = None
        self._flows: Dict[FlowKey, FlowAccumulator] = {}
        self.total_packets: int = 0
        self.total_bytes: int = 0

    def consume(self, packet) -> List[FlowRecord]:
        """Procesa un paquete y devuelve registros listos cuando se cierra una ventana."""
        ts = getattr(packet, "time", None)
        timestamp = timezone.now() if ts is None else timezone.make_aware(datetime.fromtimestamp(ts))

        flushed: List[FlowRecord] = []
        if self._current_window_start is None:
            self._current_window_start = timestamp
        elif timestamp >= self._current_window_start + timedelta(seconds=self.window_seconds):
            flushed = self._flush(timestamp)

        flow_key, accumulator = self._extract_flow(packet)
        if flow_key is None or accumulator is None:
            return flushed

        bucket = self._flows.setdefault(flow_key, accumulator)
        if bucket is not accumulator:
            bucket.packets += accumulator.packets
            bucket.bytes += accumulator.bytes
            bucket.flag_syn |= accumulator.flag_syn
            bucket.flag_fin |= accumulator.flag_fin
            bucket.flag_rst |= accumulator.flag_rst
            bucket.ttl_total += accumulator.ttl_total
            bucket.ttl_count += accumulator.ttl_count
            bucket.tcp_window_total += accumulator.tcp_window_total
            bucket.tcp_window_count += accumulator.tcp_window_count
            bucket.tcp_options.update(accumulator.tcp_options)
            if bucket.tcp_mss is None and accumulator.tcp_mss is not None:
                bucket.tcp_mss = accumulator.tcp_mss
            if not bucket.payload_sample and accumulator.payload_sample:
                bucket.payload_sample = accumulator.payload_sample
            if not bucket.src_mac and accumulator.src_mac:
                bucket.src_mac = accumulator.src_mac
            if not bucket.dst_mac and accumulator.dst_mac:
                bucket.dst_mac = accumulator.dst_mac

        return flushed

    def finalize(self) -> List[FlowRecord]:
        """Devuelve los registros pendientes al terminar una captura."""
        if not self._flows or self._current_window_start is None:
            return []
        ventana_fin = self._current_window_start + timedelta(seconds=self.window_seconds)
        records = self._build_records(ventana_fin)
        self._flows.clear()
        self._current_window_start = None
        return records

    # ------------------------------------------------------------------ #
    # Internos
    def _flush(self, next_window_start: datetime) -> List[FlowRecord]:
        ventana_fin = self._current_window_start + timedelta(seconds=self.window_seconds)
        records = self._build_records(ventana_fin)
        self._flows.clear()
        self._current_window_start = next_window_start
        return records

    def _build_records(self, ventana_fin: datetime) -> List[FlowRecord]:
        ventana_inicio = ventana_fin - timedelta(seconds=self.window_seconds)
        return [
            FlowRecord(key=key, accumulator=acc, ventana_inicio=ventana_inicio, ventana_fin=ventana_fin)
            for key, acc in self._flows.items()
        ]

    def _extract_flow(self, packet) -> Tuple[Optional[FlowKey], Optional[FlowAccumulator]]:
        ip_layer = packet.getlayer(IP) if IP else None
        if ip_layer is None:
            return None, None

        protocolo = self._resolve_protocol(packet)
        src_port, dst_port = self._resolve_ports(packet)
        direction = self._resolve_direction(ip_layer.src, ip_layer.dst)

        key = FlowKey(
            direction=direction,
            src_ip=ip_layer.src,
            dst_ip=ip_layer.dst,
            src_port=src_port,
            dst_port=dst_port,
            protocol=protocolo,
        )

        acc = FlowAccumulator()
        acc.packets = 1
        self.total_packets += 1

        size = len(packet)
        acc.bytes = size
        self.total_bytes += size

        ttl_value = getattr(ip_layer, "ttl", None)
        if ttl_value:
            acc.ttl_total = ttl_value
            acc.ttl_count = 1

        ether_layer = packet.getlayer(Ether) if Ether else None
        if ether_layer:
            acc.src_mac = ether_layer.src.lower()
            acc.dst_mac = ether_layer.dst.lower()

        if TCP and packet.haslayer(TCP):
            tcp_layer = packet.getlayer(TCP)
            flags = getattr(tcp_layer, "flags", 0)
            acc.flag_syn = bool(flags & 0x02)
            acc.flag_fin = bool(flags & 0x01)
            acc.flag_rst = bool(flags & 0x04)
            window = getattr(tcp_layer, "window", None)
            if window:
                acc.tcp_window_total = window
                acc.tcp_window_count = 1
            opciones = getattr(tcp_layer, "options", []) or []
            for nombre, valor in opciones:
                if not nombre:
                    continue
                acc.tcp_options.add(nombre)
                if nombre.lower() == "mss":
                    try:
                        acc.tcp_mss = int(valor)
                    except (TypeError, ValueError):
                        pass
            if packet.haslayer(Raw):
                payload = bytes(packet.getlayer(Raw))[:64]
                if payload:
                    acc.payload_sample = payload.hex()
        elif packet.haslayer(Raw):
            payload = bytes(packet.getlayer(Raw))[:64]
            if payload:
                acc.payload_sample = payload.hex()

        return key, acc

    def _resolve_protocol(self, packet) -> str:
        if TCP and packet.haslayer(TCP):
            return "tcp"
        if UDP and packet.haslayer(UDP):
            return "udp"
        return "otro"

    def _resolve_ports(self, packet) -> Tuple[Optional[int], Optional[int]]:
        if TCP and packet.haslayer(TCP):
            layer = packet.getlayer(TCP)
            return layer.sport, layer.dport
        if UDP and packet.haslayer(UDP):
            layer = packet.getlayer(UDP)
            return layer.sport, layer.dport
        return None, None

    def _resolve_direction(self, src_ip: str, dst_ip: str) -> str:
        if not self.local_ips:
            return "ambas"
        if src_ip in self.local_ips and dst_ip not in self.local_ips:
            return "salida"
        if dst_ip in self.local_ips and src_ip not in self.local_ips:
            return "entrada"
        return "ambas"
