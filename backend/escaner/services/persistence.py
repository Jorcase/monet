from __future__ import annotations
from typing import Sequence
from django.db import transaction
from django.utils import timezone

from escaner.models import TrabajoScanner, PuertoEncontrado, PuertoResumen
from analitica.models import HeuristicaRegla, HeuristicaEvento
from analitica.services import evaluar_reglas_globales
from analitica.services.engine import (
    construir_eventos_cambio_puerto,
    construir_eventos_estado_puerto,
    construir_eventos_umbral_puertos_abiertos,
)
from detector.models import HostDetectado, Dispositivo
from detector.services.device_type import set_device_type
from detector.services.snmp_printer import snmp_enabled, snmp_printer_info

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

    reglas_cambio = list(
        HeuristicaRegla.objects.filter(
            modulo_objetivo__in=["escaner", "global"],
            activa=True,
            parametros__tipo="cambio_puerto",
        )
    )
    reglas_estado = list(
        HeuristicaRegla.objects.filter(
            modulo_objetivo__in=["escaner", "global"],
            activa=True,
            parametros__tipo="estado_puerto",
        )
    )
    eventos_cambio: list[HeuristicaEvento] = []
    eventos_estado: list[HeuristicaEvento] = []

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
        if dispositivo and entry["puerto"] in {9100, 515, 631}:
            set_device_type(dispositivo, "impresora", fuente="detector")
            _maybe_snmp_printer(dispositivo)

        resumen = PuertoResumen.objects.filter(
            dispositivo=dispositivo,
            host_ip=host_ip,
            puerto=entry["puerto"],
            protocolo=entry["protocolo"],
        ).first()

        if resumen is None:
            resumen = PuertoResumen.objects.create(
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
            estado_anterior = resumen.estado
            nuevo_estado = entry["estado"]

            if nuevo_estado != resumen.estado:
                resumen.estado = nuevo_estado
                if reglas_cambio:
                    eventos_cambio.extend(
                        construir_eventos_cambio_puerto(
                            reglas_cambio,
                            resumen,
                            trabajo,
                            estado_anterior,
                            nuevo_estado,
                            owner=_select_owner(
                                trabajo.owner,
                                resumen.dispositivo.owner if resumen.dispositivo else None,
                                trabajo.analisis.owner if trabajo.analisis else None,
                            ),
                        )
                    )

            resumen.servicio = entry["servicio"]
            resumen.ultima_detectado = ahora
            resumen.ultima_trabajo = trabajo
            resumen.save(update_fields=["estado", "servicio", "ultima_detectado", "ultima_trabajo"])

        if reglas_estado:
            eventos_estado.extend(
                construir_eventos_estado_puerto(
                    reglas_estado,
                    resumen,
                    trabajo,
                    entry,
                    owner=_select_owner(
                        trabajo.owner,
                        resumen.dispositivo.owner if resumen.dispositivo else None,
                        trabajo.analisis.owner if trabajo.analisis else None,
                    ),
                )
            )

    if eventos_cambio:
        HeuristicaEvento.objects.bulk_create(eventos_cambio)
    if eventos_estado:
        HeuristicaEvento.objects.bulk_create(eventos_estado)

    reglas_umbral = list(
        HeuristicaRegla.objects.filter(
            modulo_objetivo__in=["escaner", "global"],
            activa=True,
            parametros__tipo="umbral_puertos_abiertos",
        )
    )
    if reglas_umbral:
        eventos_umbral = construir_eventos_umbral_puertos_abiertos(reglas_umbral, owner=trabajo.owner)
        if eventos_umbral:
            HeuristicaEvento.objects.bulk_create(eventos_umbral)

    if reglas_cambio or reglas_estado or reglas_umbral:
        evaluar_reglas_globales(owner=trabajo.owner)


def _select_owner(*owners):
    for owner in owners:
        if owner:
            return owner
    return None


def _maybe_snmp_printer(dispositivo: Dispositivo) -> None:
    if not dispositivo or not snmp_enabled():
        return
    desc = snmp_printer_info(dispositivo.ip)
    if desc and any(keyword in desc.lower() for keyword in ["printer", "hp", "epson", "brother", "canon"]):
        set_device_type(dispositivo, "impresora", fuente="detector")
