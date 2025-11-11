from __future__ import annotations

from typing import Iterable, List

from analitica.models import HeuristicaEvento, HeuristicaRegla
from captura.models import CapturaSesion, CapturaFlujo
from escaner.models import PuertoResumen
from detector.models import Dispositivo


def evaluar_reglas_para_captura(sesion: CapturaSesion, owner=None) -> int:
    """Evalúa reglas cuyo módulo es 'captura' o 'global' usando los flujos de la sesión."""
    owner = owner or sesion.owner
    reglas = HeuristicaRegla.objects.filter(modulo_objetivo__in=["captura", "global"], activa=True)
    if not reglas:
        return 0

    flujos = CapturaFlujo.objects.filter(sesion=sesion).select_related("dispositivo_origen", "dispositivo_destino")
    eventos = []

    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") == "umbral_trafico":
            eventos.extend(_detectar_umbral_trafico(regla, flujos, sesion, owner))
        elif params.get("tipo") == "puerto_sensible":
            eventos.extend(_detectar_puertos_sensibles(regla, flujos, sesion, owner))

    HeuristicaEvento.objects.bulk_create(eventos)
    return len(eventos)


def evaluar_reglas_globales(owner=None) -> int:
    """Ejecuta reglas globales sobre dispositivos/puertos consolidados."""
    reglas = HeuristicaRegla.objects.filter(modulo_objetivo="global", activa=True)
    if not reglas:
        return 0

    eventos = []
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") == "puerto_persistente":
            eventos.extend(_detectar_puertos_persistentes(regla, owner))

    HeuristicaEvento.objects.bulk_create(eventos)
    return len(eventos)


def _detectar_umbral_trafico(
    regla: HeuristicaRegla,
    flujos: Iterable[CapturaFlujo],
    sesion: CapturaSesion,
    owner,
):
    limite_bytes = regla.parametros.get("limite_bytes", 10_000_000)
    eventos = []
    for flujo in flujos:
        if flujo.bytes >= limite_bytes:
            dispositivo = flujo.dispositivo_origen or flujo.dispositivo_destino
            eventos.append(
                HeuristicaEvento(
                    regla=regla,
                    captura_sesion=sesion,
                    captura_flujo=flujo,
                    dispositivo=dispositivo,
                    severidad=regla.severidad_por_defecto,
                    descripcion=f"Flujo con alto volumen hacia {flujo.dst_ip}",
                    evidencia={
                        "bytes": flujo.bytes,
                        "src_ip": flujo.src_ip,
                        "dst_ip": flujo.dst_ip,
                        "protocolo": flujo.protocolo,
                    },
                    owner=_first_owner(owner, sesion.owner, dispositivo.owner if dispositivo else None),
                )
            )
    return eventos


def _detectar_puertos_sensibles(
    regla: HeuristicaRegla,
    flujos: Iterable[CapturaFlujo],
    sesion: CapturaSesion,
    owner,
):
    puertos_observados = regla.parametros.get("puertos", [22, 3389, 5900])
    eventos = []
    for flujo in flujos:
        if flujo.dst_port in puertos_observados or flujo.src_port in puertos_observados:
            dispositivo = flujo.dispositivo_origen or flujo.dispositivo_destino
            eventos.append(
                HeuristicaEvento(
                    regla=regla,
                    captura_sesion=sesion,
                    captura_flujo=flujo,
                    dispositivo=dispositivo,
                    severidad=regla.severidad_por_defecto,
                    descripcion=f"Tráfico hacia puerto sensible {flujo.dst_port or flujo.src_port}",
                    evidencia={
                        "src_ip": flujo.src_ip,
                        "dst_ip": flujo.dst_ip,
                        "puerto": flujo.dst_port or flujo.src_port,
                    },
                    owner=_first_owner(owner, sesion.owner, dispositivo.owner if dispositivo else None),
                )
            )
    return eventos


def _detectar_puertos_persistentes(regla: HeuristicaRegla, owner):
    dias = regla.parametros.get("dias", 7)
    eventos = []
    recientes = PuertoResumen.objects.filter(ultima_detectado__gte=rule_time(dias))
    if owner:
        recientes = recientes.filter(dispositivo__owner=owner)
    for resumen in recientes:
        if resumen.estado == "abierto" and resumen.dispositivo and resumen.dispositivo.estado != "aprobado":
            eventos.append(
                HeuristicaEvento(
                    regla=regla,
                    puerto_resumen=resumen,
                    dispositivo=resumen.dispositivo,
                    severidad=regla.severidad_por_defecto,
                    descripcion=f"Puerto {resumen.puerto}/{resumen.protocolo} lleva abierto varios días.",
                    evidencia={
                        "host_ip": resumen.host_ip,
                        "puerto": resumen.puerto,
                        "ultima_detectado": resumen.ultima_detectado.isoformat(),
                    },
                    owner=_first_owner(
                        owner,
                        resumen.dispositivo.owner if resumen.dispositivo else None,
                        resumen.ultima_trabajo.owner if resumen.ultima_trabajo else None,
                    ),
                )
            )
    return eventos


def rule_time(dias: int):
    from django.utils import timezone
    return timezone.now() - timezone.timedelta(days=dias)


def construir_eventos_cambio_puerto(
    reglas: Iterable[HeuristicaRegla],
    puerto_resumen,
    trabajo,
    estado_anterior: str,
    estado_nuevo: str,
    owner=None,
) -> List[HeuristicaEvento]:
    eventos = []
    for regla in reglas:
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=trabajo.analisis,
                puerto_resumen=puerto_resumen,
                dispositivo=puerto_resumen.dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Puerto {puerto_resumen.puerto}/{puerto_resumen.protocolo} cambió de {estado_anterior} a {estado_nuevo}",
                evidencia={
                    "host_ip": puerto_resumen.host_ip,
                    "estado_anterior": estado_anterior,
                    "estado_nuevo": estado_nuevo,
                    "trabajo_id": trabajo.id,
                },
                owner=_first_owner(
                    owner,
                    trabajo.owner,
                    trabajo.analisis.owner if trabajo.analisis else None,
                    puerto_resumen.dispositivo.owner if puerto_resumen.dispositivo else None,
                ),
            )
        )
    return eventos


def _first_owner(*owners):
    for owner in owners:
        if owner:
            return owner
    return None
