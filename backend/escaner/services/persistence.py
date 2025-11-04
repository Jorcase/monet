from __future__ import annotations
from typing import Sequence
from django.db import transaction
from django.utils import timezone

from escaner.models import TrabajoScanner, PuertoEncontrado, PuertoResumen
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

    nota_previa = (trabajo.notas or "").strip()
    resumen_texto = f"A: {abiertos} / C: {cerrados} / F: {filtrados}"
    trabajo.notas = f"{nota_previa} · {resumen_texto}" if nota_previa else resumen_texto
    ahora = timezone.now()
    trabajo.fin = ahora
    trabajo.estado = "completado"
    trabajo.save(update_fields=["notas","fin","estado"])

    for entry in resultados:
        host_ip = entry["host"]
        dispositivo = Dispositivo.objects.filter(ip=host_ip).first()
        host_detectado = None
        if trabajo.analisis_id:
            host_detectado = HostDetectado.objects.filter(analisis=trabajo.analisis, ip=host_ip).first()

        PuertoEncontrado.objects.create(
            trabajo=trabajo,
            analisis=trabajo.analisis,
            host_detectado=host_detectado,
            dispositivo=dispositivo,
            host_ip=host_ip,
            puerto=entry["puerto"],
            protocolo=entry["protocolo"],
            servicio=entry["servicio"],
            estado=entry["estado"],
        )

        resumen = PuertoResumen.objects.filter(
            dispositivo=dispositivo,
            host_ip=host_ip,
            puerto=entry["puerto"],
            protocolo=entry["protocolo"],
        ).first()

        if resumen is None:
            PuertoResumen.objects.create(
                dispositivo=dispositivo,
                host_ip=host_ip,
                puerto=entry["puerto"],
                protocolo=entry["protocolo"],
                servicio=entry["servicio"],
                estado=entry["estado"],
                primera_detectado=ahora,
                ultima_detectado=ahora,
                ultima_trabajo=trabajo,
            )
        else:
            nuevo_estado = resumen.estado
            if entry["estado"] == "abierto":
                nuevo_estado = "abierto"
            elif trabajo.tipo_scan == "personalizado":
                nuevo_estado = entry["estado"]
            elif resumen.estado not in {"abierto"}:
                nuevo_estado = entry["estado"]

            if nuevo_estado != resumen.estado:
                resumen.estado = nuevo_estado

            resumen.servicio = entry["servicio"]
            resumen.ultima_detectado = ahora
            resumen.ultima_trabajo = trabajo
            resumen.save(update_fields=["estado", "servicio", "ultima_detectado", "ultima_trabajo"])
