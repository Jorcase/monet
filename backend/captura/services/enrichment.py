from __future__ import annotations

from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Sequence, Optional

from django.utils import timezone

from captura.models import FingerprintObservacion
from detector.models import Dispositivo

PRIORIDAD_METODOS = ["p0f", "activo", "pasivo"]
TIPO_PRIORIDAD = {
    "desconocido": 0,
    "iot": 1,
    "impresora": 1,
    "router": 1,
    "tv": 1,
    "movil": 2,
    "pc": 2,
    "servidor": 2,
}

VENDOR_HINTS = {
    "apple": "movil",
    "samsung": "movil",
    "xiaomi": "movil",
    "huawei": "movil",
    "oneplus": "movil",
    "motorola": "movil",
    "lge": "tv",
    "lg electronics": "tv",
    "sony": "tv",
    "philips": "tv",
    "hisense": "tv",
    "lenovo": "pc",
    "hp": "pc",
    "hewlett-packard": "pc",
    "dell": "pc",
    "asus": "pc",
    "acer": "pc",
    "brother": "impresora",
    "canon": "impresora",
    "epson": "impresora",
    "mikrotik": "router",
    "cisco": "router",
    "tplink": "router",
    "ubiquiti": "router",
}

HOSTNAME_HINTS = {
    "iphone": "movil",
    "android": "movil",
    "galaxy": "movil",
    "redmi": "movil",
    "miui": "movil",
    "smart-tv": "tv",
    "tv": "tv",
    "chromecast": "tv",
    "roku": "tv",
    "printer": "impresora",
    "print": "impresora",
    "router": "router",
    "gateway": "router",
    "nas": "servidor",
    "server": "servidor",
    "desktop": "pc",
    "laptop": "pc",
    "pc": "pc",
}


def actualizar_dispositivos_con_fingerprints(
    observaciones: Iterable[FingerprintObservacion],
    *,
    prioridad_metodos: Sequence[str] = PRIORIDAD_METODOS,
) -> int:
    """
    Toma una colección de observaciones y actualiza los dispositivos con la mejor coincidencia.
    Devuelve cuántos dispositivos fueron actualizados.
    """
    mejor_por_dispositivo: Dict[int, FingerprintObservacion] = {}
    prioridad = {metodo: idx for idx, metodo in enumerate(prioridad_metodos)}

    for obs in observaciones:
        dispositivo_id = obs.dispositivo_id
        actual = mejor_por_dispositivo.get(dispositivo_id)
        if not actual:
            mejor_por_dispositivo[dispositivo_id] = obs
            continue
        # Comparar por método y probabilidad
        actual_prio = prioridad.get(actual.metodo, len(prioridad))
        obs_prio = prioridad.get(obs.metodo, len(prioridad))
        if obs_prio < actual_prio or (
            obs_prio == actual_prio and (obs.probabilidad or 0) > (actual.probabilidad or 0)
        ):
            mejor_por_dispositivo[dispositivo_id] = obs

    actualizados = 0
    for dispositivo_id, obs in mejor_por_dispositivo.items():
        dispositivo = Dispositivo.objects.filter(id=dispositivo_id).first()
        if not dispositivo:
            continue
        cambios = {}
        if obs.sistema_estimado and dispositivo.sistema_operativo != obs.sistema_estimado:
            cambios["sistema_operativo"] = obs.sistema_estimado
        if dispositivo.fuente_fingerprint != obs.metodo:
            cambios["fuente_fingerprint"] = obs.metodo
        cambios["ultima_fingerprint"] = obs.timestamp
        if cambios:
            dispositivo.__dict__.update(cambios)
            dispositivo.save(update_fields=list(cambios.keys()))
            actualizados += 1
        aplicar_clasificacion_por_fingerprint(dispositivo, obs.sistema_estimado)
    return actualizados


def actualizar_hostname_por_captura(ip: str | None, hostname: str, *, source: str = "captura", mac: str | None = None) -> bool:
    if not hostname:
        return False
    dispositivo = None
    if mac:
        dispositivo = Dispositivo.objects.filter(mac=mac.lower()).first()
    if not dispositivo and ip:
        dispositivo = (
            Dispositivo.objects.filter(ip=ip)
            .order_by("-ultima_vez")
            .first()
        )
    if not dispositivo:
        return False

    cambios = {}
    if hostname and dispositivo.hostname != hostname and dispositivo.hostname_fuente != "manual":
        cambios["hostname"] = hostname
        cambios["hostname_fuente"] = source
    elif dispositivo.hostname_fuente == "sin_datos" and dispositivo.hostname == hostname:
        cambios["hostname_fuente"] = source

    if cambios:
        dispositivo.__dict__.update(cambios)
        dispositivo.save(update_fields=list(cambios.keys()))

    aplicar_clasificacion_heuristica(dispositivo, hostname_hint=hostname)
    return bool(cambios)


def aplicar_clasificacion_heuristica(dispositivo: Dispositivo, hostname_hint: Optional[str] = None):
    if dispositivo.tipo_fuente == "manual":
        return False

    tipo = inferir_tipo_por_hostname(hostname_hint or dispositivo.hostname)
    if not tipo or tipo == dispositivo.tipo_dispositivo:
        tipo = inferir_tipo_por_vendor(dispositivo.vendor)
    if not tipo:
        return False
    return actualizar_tipo_dispositivo(dispositivo, tipo, fuente="heuristica")


def aplicar_clasificacion_por_fingerprint(dispositivo: Dispositivo, sistema_operativo: Optional[str]):
    if dispositivo.tipo_fuente == "manual" or not sistema_operativo:
        return False
    so = sistema_operativo.lower()
    tipo = None
    if any(keyword in so for keyword in ["windows", "mac os", "ubuntu", "debian"]):
        tipo = "pc"
    if "server" in so or "linux" in so:
        tipo = tipo or "servidor"
    return actualizar_tipo_dispositivo(dispositivo, tipo, fuente="heuristica")


def inferir_tipo_por_vendor(vendor: str | None) -> Optional[str]:
    if not vendor:
        return None
    vendor_lower = vendor.lower()
    for clave, tipo in VENDOR_HINTS.items():
        if clave in vendor_lower:
            return tipo
    return None


def inferir_tipo_por_hostname(hostname: str | None) -> Optional[str]:
    if not hostname:
        return None
    nombre = hostname.lower()
    for clave, tipo in HOSTNAME_HINTS.items():
        if clave in nombre:
            return tipo
    return None


def actualizar_tipo_dispositivo(dispositivo: Dispositivo, tipo: Optional[str], fuente: str = "heuristica") -> bool:
    if not tipo or tipo == "desconocido":
        return False
    if dispositivo.tipo_fuente == "manual" and dispositivo.tipo_dispositivo != tipo:
        return False
    prioridad_actual = TIPO_PRIORIDAD.get(dispositivo.tipo_dispositivo, 0)
    prioridad_nueva = TIPO_PRIORIDAD.get(tipo, 0)
    if dispositivo.tipo_dispositivo == tipo and dispositivo.tipo_fuente != "manual":
        if dispositivo.tipo_fuente != fuente:
            dispositivo.tipo_fuente = fuente
            dispositivo.save(update_fields=["tipo_fuente"])
            return True
        return False
    if prioridad_nueva >= prioridad_actual:
        dispositivo.tipo_dispositivo = tipo
        dispositivo.tipo_fuente = fuente
        dispositivo.save(update_fields=["tipo_dispositivo", "tipo_fuente"])
        return True
    return False
 
