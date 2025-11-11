from __future__ import annotations

from typing import Dict, Iterable, Optional

from django.db import transaction

from captura.models import CapturaFlujo
from captura.services.aggregator import FlowRecord
from detector.models import Dispositivo


def persist_flows(sesion, records: Iterable[FlowRecord]) -> None:
    """Convierte los FlowRecord en CapturaFlujo."""
    device_cache: Dict[str, Optional[Dispositivo]] = {}
    objetos = []

    for record in records:
        dispositivo_origen = _resolve_device(record.accumulator.src_mac, record.key.src_ip, device_cache)
        dispositivo_destino = _resolve_device(record.accumulator.dst_mac, record.key.dst_ip, device_cache)

        objetos.append(
            CapturaFlujo(
                sesion=sesion,
                ventana_inicio=record.ventana_inicio,
                ventana_fin=record.ventana_fin,
                direccion=record.key.direction,
                src_ip=record.key.src_ip,
                dst_ip=record.key.dst_ip,
                src_port=record.key.src_port,
                dst_port=record.key.dst_port,
                src_mac=record.accumulator.src_mac,
                dst_mac=record.accumulator.dst_mac,
                protocolo=record.key.protocol,
                paquetes=record.accumulator.packets,
                bytes=record.accumulator.bytes,
                flag_syn=record.accumulator.flag_syn,
                flag_fin=record.accumulator.flag_fin,
                flag_rst=record.accumulator.flag_rst,
                ttl_promedio=record.accumulator.ttl_promedio(),
                tcp_window_promedio=record.accumulator.tcp_window_promedio(),
                tcp_mss=record.accumulator.tcp_mss,
                tcp_opciones=record.accumulator.opciones_texto(),
                payload_muestra=record.accumulator.payload_sample,
                dispositivo_origen=dispositivo_origen,
                dispositivo_destino=dispositivo_destino,
            )
        )

    if objetos:
        CapturaFlujo.objects.bulk_create(objetos, batch_size=200)


def _resolve_device(mac: Optional[str], ip: str, cache: Dict[str, Optional[Dispositivo]]) -> Optional[Dispositivo]:
    key = mac or ip
    if key in cache:
        return cache[key]

    device: Optional[Dispositivo] = None
    if mac:
        device = Dispositivo.objects.filter(mac=mac).first()
    if not device:
        device = Dispositivo.objects.filter(ip=ip).first()

    cache[key] = device
    return device
