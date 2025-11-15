from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

from django.utils import timezone

import os

if os.environ.get("SCAPY_SKIP_RUNTIME") == "1":
    IP = TCP = UDP = Ether = Raw = None  # type: ignore
    SCAPY_AVAILABLE = False
else:
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

    def merge(self, other: "FlowAccumulator") -> None:
        self.packets += other.packets
        self.bytes += other.bytes
        self.flag_syn |= other.flag_syn
        self.flag_fin |= other.flag_fin
        self.flag_rst |= other.flag_rst
        self.ttl_total += other.ttl_total
        self.ttl_count += other.ttl_count
        self.tcp_window_total += other.tcp_window_total
        self.tcp_window_count += other.tcp_window_count
        self.tcp_options.update(other.tcp_options)
        if self.tcp_mss is None and other.tcp_mss is not None:
            self.tcp_mss = other.tcp_mss
        if not self.payload_sample and other.payload_sample:
            self.payload_sample = other.payload_sample

        if not self.src_mac and other.src_mac:
            self.src_mac = other.src_mac
        if not self.dst_mac and other.dst_mac:
            self.dst_mac = other.dst_mac


@dataclass
class FlowRecord:
    key: FlowKey
    accumulator: FlowAccumulator
    ventana_inicio: datetime
    ventana_fin: datetime


@dataclass
class FlowBucket:
    accumulator: FlowAccumulator
    first_seen: datetime
    last_seen: datetime


class FlowAggregator:
    """Agrupa paquetes por flujo hasta que expiran por inactividad."""

    def __init__(
        self,
        window_seconds: int = 10,
        local_ips: Optional[Sequence[str]] = None,
        local_macs: Optional[Sequence[str]] = None,
    ) -> None:
        if not SCAPY_AVAILABLE:
            raise CaptureUnavailable("Scapy no está instalado; no se puede capturar tráfico.")

        self.timeout_seconds = max(window_seconds, 1)
        self.local_ips: Set[str] = set(local_ips or [])
        self.local_macs: Set[str] = {mac.lower() for mac in (local_macs or []) if mac}

        self._flows: Dict[FlowKey, FlowBucket] = {}
        self.total_packets: int = 0
        self.total_bytes: int = 0

    def consume(self, packet) -> List[FlowRecord]:
        """Procesa un paquete y devuelve registros listos cuando caducan por inactividad."""
        ts = getattr(packet, "time", None)
        timestamp = timezone.now() if ts is None else timezone.make_aware(datetime.fromtimestamp(ts))

        flushed = self._expire_flows(timestamp)

        flow_key, accumulator = self._extract_flow(packet)
        if flow_key is None or accumulator is None:
            return flushed

        bucket = self._flows.get(flow_key)
        if bucket is None:
            self._flows[flow_key] = FlowBucket(
                accumulator=accumulator,
                first_seen=timestamp,
                last_seen=timestamp,
            )
        else:
            bucket.accumulator.merge(accumulator)
            bucket.last_seen = timestamp

        return flushed

    def finalize(self) -> List[FlowRecord]:
        """Devuelve los registros pendientes al terminar una captura."""
        if not self._flows:
            return []
        records = [
            FlowRecord(
                key=key,
                accumulator=bucket.accumulator,
                ventana_inicio=bucket.first_seen,
                ventana_fin=bucket.last_seen,
            )
            for key, bucket in self._flows.items()
        ]
        self._flows.clear()
        return records

    # ------------------------------------------------------------------ #
    # Internos
    def _expire_flows(self, now: datetime) -> List[FlowRecord]:
        if not self._flows:
            return []
        threshold = now - timedelta(seconds=self.timeout_seconds)
        expired: List[FlowRecord] = []
        to_remove: List[FlowKey] = []
        for key, bucket in self._flows.items():
            if bucket.last_seen <= threshold:
                expired.append(
                    FlowRecord(
                        key=key,
                        accumulator=bucket.accumulator,
                        ventana_inicio=bucket.first_seen,
                        ventana_fin=bucket.last_seen,
                    )
                )
                to_remove.append(key)
        for key in to_remove:
            self._flows.pop(key, None)
        return expired

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
