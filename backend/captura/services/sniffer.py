from __future__ import annotations

from threading import Event
from typing import Iterable, Optional, Sequence

from django.utils import timezone

from captura.models import CapturaSesion
from captura.services.aggregator import CaptureUnavailable, FlowAggregator
from captura.services.persistence import persist_flows
from captura.services.session import increment_session_counters, mark_session_state, recompute_statistics
from captura.services.fingerprint import generar_fingerprints_para_sesion
from captura.services.enrichment import actualizar_dispositivos_con_fingerprints

import os

if os.environ.get("SCAPY_SKIP_RUNTIME") == "1":
    sniff = None
else:
    try:
        from scapy.all import sniff
    except ImportError:  # pragma: no cover
        sniff = None


def run_passive_capture(
    sesion: CapturaSesion,
    *,
    ventana_segundos: int = 10,
    duracion_segundos: Optional[int] = None,
    filtro_bpf: Optional[str] = None,
    interfaz: Optional[str] = None,
    local_ips: Optional[Sequence[str]] = None,
    local_macs: Optional[Sequence[str]] = None,
    stop_event: Optional[Event] = None,
) -> None:
    """
    Ejecuta una captura pasiva sobre la interfaz indicada y persiste los flujos.
    Requiere permisos de root para que Scapy pueda abrir la interfaz en modo promiscuo.
    """
    if sniff is None:
        raise CaptureUnavailable("Scapy no está instalado.")

    interfaz_objetivo = interfaz or sesion.interfaz
    filtro = filtro_bpf if filtro_bpf is not None else sesion.filtro_bpf

    aggregator = FlowAggregator(
        window_seconds=ventana_segundos,
        local_ips=local_ips,
        local_macs=local_macs,
    )

    sesion.estado = "capturando"
    sesion.inicio = timezone.now()
    sesion.save(update_fields=["estado", "inicio"])

    def _handle_packet(packet):
        ready = aggregator.consume(packet)
        if ready:
            persist_flows(sesion, ready)
        if stop_event and stop_event.is_set():
            raise KeyboardInterrupt

    try:
        sniff(
            iface=interfaz_objetivo,
            prn=_handle_packet,
            store=False,
            filter=filtro or None,
            timeout=duracion_segundos,
        )
    except KeyboardInterrupt:
        pass
    finally:
        remaining = aggregator.finalize()
        if remaining:
            persist_flows(sesion, remaining)
        increment_session_counters(
            sesion,
            paquetes=aggregator.total_packets,
            bytes_totales=aggregator.total_bytes,
        )
        mark_session_state(sesion, estado="completada", fin=timezone.now())
        try:
            recompute_statistics(sesion)
        except Exception:
            pass
        try:
            nuevos = generar_fingerprints_para_sesion(sesion)
            if nuevos:
                from captura.models import FingerprintObservacion

                obs = FingerprintObservacion.objects.filter(sesion=sesion)
                actualizar_dispositivos_con_fingerprints(obs)
        except Exception:
            pass
