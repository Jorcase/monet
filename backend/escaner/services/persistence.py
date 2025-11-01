from __future__ import annotations
from typing import Sequence
from django.db import transaction
from django.utils import timezone

from escaner.models import TrabajoScanner, PuertoEncontrado
from detector.models import HostDetectado, Dispositivo

@transaction.atomic
def guardar_resultados(
    trabajo: TrabajoScanner,
    resultados: Sequence[dict[str, str | int]],
    resumen_estados: dict[str, int],
) -> None:
    abiertos = resumen_estados.get("abierto",0)
    cerrados = resumen_estados.get("cerrado",0)
    filtrados = resumen_estados.get("filtrado",0)

    trabajo.notas = f"A: {abiertos} / C: {cerrados} / F: {filtrados}"
    trabajo.fin = timezone.now()
    trabajo.estado = "completado"
    trabajo.save(update_fields=["notas","fin","estado"])

    for entry in resultados:
        host_ip = entry["host"]
        dispositivo = Dispositivo.objects.filter(ip=host_ip).first()
        host_detectado = HostDetectado.objects.filter(analisis = trabajo.analisis, ip=host_ip).first()

        PuertoEncontrado.objects.create(
            trabajo=trabajo,
            analisis=trabajo.analisis,
            host_detectado=host_detectado,
            dispositivo=dispositivo,
            puerto=entry["puerto"],
            protocolo=entry["protocolo"],
            servicio=entry["servicio"],
            estado=entry["estado"],
        )