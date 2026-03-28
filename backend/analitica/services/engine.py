from __future__ import annotations

from typing import Iterable, List
from django.db.models import Count

from analitica.models import HeuristicaEvento, HeuristicaRegla
from captura.models import CapturaSesion, CapturaFlujo
from escaner.models import PuertoResumen
from detector.models import Dispositivo, HostDetectado


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
        elif params.get("tipo") == "categoria_dominio":
            eventos.extend(_detectar_categoria_dominio(regla, flujos, sesion, owner))
        elif params.get("tipo") == "dominio_especifico":
            eventos.extend(_detectar_dominio_especifico(regla, flujos, sesion, owner))

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


def _detectar_categoria_dominio(
    regla: HeuristicaRegla,
    flujos: Iterable[CapturaFlujo],
    sesion: CapturaSesion,
    owner,
):
    categorias = {
        c.lower().strip() for c in regla.parametros.get("categorias", []) if isinstance(c, str)
    }
    if not categorias:
        return []
    eventos = []
    for flujo in flujos:
        cat = (flujo.categoria_dominio or "").lower().strip()
        if not cat or cat not in categorias:
            continue
        dispositivo = flujo.dispositivo_origen or flujo.dispositivo_destino
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                captura_sesion=sesion,
                captura_flujo=flujo,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Tráfico categorizado como {cat} hacia {flujo.dst_ip}",
                evidencia={
                    "categoria": cat,
                    "sni": flujo.sni,
                    "dst_ip": flujo.dst_ip,
                    "src_ip": flujo.src_ip,
                },
                owner=_first_owner(owner, sesion.owner, dispositivo.owner if dispositivo else None),
            )
        )
    return eventos


def _detectar_dominio_especifico(
    regla: HeuristicaRegla,
    flujos: Iterable[CapturaFlujo],
    sesion: CapturaSesion,
    owner,
):
    sufijos = {s.lower().strip() for s in regla.parametros.get("dominios", []) if isinstance(s, str)}
    sufijos = {s for s in sufijos if s}
    if not sufijos:
        return []
    eventos = []
    for flujo in flujos:
        host = (flujo.sni or "").lower()
        if not host or not any(host.endswith(suf) for suf in sufijos):
            continue
        dispositivo = flujo.dispositivo_origen or flujo.dispositivo_destino
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                captura_sesion=sesion,
                captura_flujo=flujo,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Se detectó acceso al dominio {host}",
                evidencia={
                    "sni": host,
                    "dst_ip": flujo.dst_ip,
                    "src_ip": flujo.src_ip,
                },
                owner=_first_owner(owner, sesion.owner, dispositivo.owner if dispositivo else None),
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
        params = regla.parametros or {}
        cambios = params.get("cambios")
        if cambios:
            pares_validos = {
                (c[0], c[1]) for c in cambios if isinstance(c, (list, tuple)) and len(c) == 2
            }
            if pares_validos and (estado_anterior, estado_nuevo) not in pares_validos:
                continue

        puertos = params.get("puertos")
        if puertos and puerto_resumen.puerto not in puertos:
            continue

        protocolos = params.get("protocolos")
        if protocolos and puerto_resumen.protocolo not in protocolos:
            continue

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


def construir_eventos_nuevo_host(
    reglas: Iterable[HeuristicaRegla],
    host: HostDetectado,
    dispositivo: Dispositivo | None = None,
    owner=None,
):
    eventos = []
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") != "nuevo_host":
            continue
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=host.analisis,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Nuevo dispositivo detectado {host.ip}",
                evidencia={
                    "ip": host.ip,
                    "mac": host.mac,
                    "hostname": host.hostname,
                    "metodo": host.metodo_deteccion,
                },
                owner=_first_owner(owner, host.analisis.owner if host.analisis else None, dispositivo.owner if dispositivo else None),
            )
        )
    return eventos


def construir_eventos_mac_aleatoria(
    reglas: Iterable[HeuristicaRegla],
    host: HostDetectado,
    dispositivo: Dispositivo | None = None,
    owner=None,
):
    eventos = []
    if not host.mac:
        return eventos
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") != "mac_aleatoria":
            continue
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=host.analisis,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"MAC aleatoria detectada en {host.ip}",
                evidencia={
                    "ip": host.ip,
                    "mac": host.mac,
                    "hostname": host.hostname,
                },
                owner=_first_owner(owner, host.analisis.owner if host.analisis else None, dispositivo.owner if dispositivo else None),
            )
        )
    return eventos


def construir_eventos_mac_especifica(
    reglas: Iterable[HeuristicaRegla],
    host: HostDetectado,
    dispositivo: Dispositivo | None = None,
    owner=None,
):
    eventos = []
    if not host.mac:
        return eventos
    mac_lower = host.mac.lower()
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") != "mac_especifica":
            continue
        macs = {m.lower() for m in params.get("macs", []) if isinstance(m, str)}
        if macs and mac_lower not in macs:
            continue
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=host.analisis,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Detectada MAC objetivo {host.mac} en {host.ip}",
                evidencia={
                    "ip": host.ip,
                    "mac": host.mac,
                    "hostname": host.hostname,
                },
                owner=_first_owner(owner, host.analisis.owner if host.analisis else None, dispositivo.owner if dispositivo else None),
            )
        )
    return eventos


def construir_eventos_cambio_hostname(
    reglas: Iterable[HeuristicaRegla],
    dispositivo: Dispositivo,
    hostname_anterior: str | None,
    hostname_nuevo: str | None,
    owner=None,
):
    eventos = []
    if hostname_anterior == hostname_nuevo:
        return eventos
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") != "cambio_hostname":
            continue
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=None,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Cambio de hostname en dispositivo {dispositivo.mac}",
                evidencia={
                    "hostname_anterior": hostname_anterior,
                    "hostname_nuevo": hostname_nuevo,
                    "ip": dispositivo.ip,
                    "mac": dispositivo.mac,
                },
                owner=_first_owner(owner, dispositivo.owner),
            )
        )
    return eventos


def construir_eventos_cambio_ip(
    reglas: Iterable[HeuristicaRegla],
    dispositivo: Dispositivo,
    ip_anterior: str,
    ip_nueva: str,
    owner=None,
):
    eventos = []
    if ip_anterior == ip_nueva:
        return eventos
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") != "cambio_ip":
            continue
        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=None,
                dispositivo=dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Cambio de IP en dispositivo {dispositivo.mac}: {ip_anterior} → {ip_nueva}",
                evidencia={
                    "ip_anterior": ip_anterior,
                    "ip_nueva": ip_nueva,
                    "mac": dispositivo.mac,
                },
                owner=_first_owner(owner, dispositivo.owner),
            )
        )
    return eventos


def construir_eventos_umbral_puertos_abiertos(
    reglas: Iterable[HeuristicaRegla],
    owner=None,
):
    eventos = []
    for regla in reglas:
        params = regla.parametros or {}
        if params.get("tipo") != "umbral_puertos_abiertos":
            continue
        umbral = params.get("umbral", 6)
        protocolos = params.get("protocolos")
        qs = PuertoResumen.objects.filter(estado="abierto")
        if owner:
            qs = qs.filter(dispositivo__owner=owner)
        if protocolos:
            qs = qs.filter(protocolo__in=protocolos)
        agrupados = qs.values("host_ip").annotate(total=Count("id"))
        for grupo in agrupados:
            if grupo["total"] >= umbral:
                eventos.append(
                    HeuristicaEvento(
                        regla=regla,
                        puerto_resumen=None,
                        dispositivo=None,
                        severidad=regla.severidad_por_defecto,
                        descripcion=f"Host {grupo['host_ip']} con {grupo['total']} puertos abiertos.",
                        evidencia={
                            "host_ip": grupo["host_ip"],
                            "puertos_abiertos": grupo["total"],
                            "umbral": umbral,
                        },
                        owner=_first_owner(owner),
                    )
                )
    return eventos


def construir_eventos_estado_puerto(
    reglas: Iterable[HeuristicaRegla],
    puerto_resumen: PuertoResumen,
    trabajo,
    entrada: dict,
    owner=None,
):
    eventos = []
    for regla in reglas:
        params = regla.parametros or {}
        estado_objetivo = params.get("estado")
        if estado_objetivo:
            if isinstance(estado_objetivo, (list, tuple, set)):
                if entrada["estado"] not in estado_objetivo:
                    continue
            elif entrada["estado"] != estado_objetivo:
                continue

        puertos = params.get("puertos")
        if puertos:
            if entrada["puerto"] not in puertos:
                continue

        protocolos = params.get("protocolos")
        if protocolos:
            if entrada["protocolo"] not in protocolos:
                continue

        eventos.append(
            HeuristicaEvento(
                regla=regla,
                analisis=trabajo.analisis,
                puerto_resumen=puerto_resumen,
                dispositivo=puerto_resumen.dispositivo,
                severidad=regla.severidad_por_defecto,
                descripcion=f"Puerto {entrada['puerto']}/{entrada['protocolo'].upper()} {entrada['estado']} en {entrada['host']}",
                evidencia={
                    "host_ip": entrada["host"],
                    "estado": entrada["estado"],
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
