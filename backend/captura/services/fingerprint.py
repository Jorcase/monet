from __future__ import annotations

import os
import shutil
import subprocess
from typing import Dict, Optional, Tuple

from captura.models import CapturaSesion, FingerprintObservacion

FINGERPRINT_RULES = [
    {
        "sistema": "Windows 10/11",
        "ttl": 128,
        "window": {64240, 65535},
        "mss": {1460},
        "options": {"mss", "sackok", "timestamp", "nop", "wscale"},
    },
    {
        "sistema": "Windows 7/8",
        "ttl": 128,
        "window": {8192, 65535},
        "mss": {1460},
        "options": {"mss", "nop", "wscale"},
    },
    {
        "sistema": "Linux (kernel 3+)",
        "ttl": 64,
        "window": {29200, 5840, 64240},
        "mss": {1460, 1420},
        "options": {"mss", "sackok", "timestamp", "nop", "wscale"},
    },
    {
        "sistema": "Android/iOS",
        "ttl": 64,
        "window": {65535},
        "mss": {1460},
        "options": {"mss", "timestamp", "nop", "wscale"},
    },
    {
        "sistema": "Cisco / Networking",
        "ttl": 255,
        "window": {4128, 8192},
        "mss": {1460},
        "options": {"mss", "nop"},
    },
]


def _score_rule(flujo, regla) -> Tuple[int, float]:
    score = 0
    ttl = flujo.ttl_promedio
    if ttl:
        diff = abs(ttl - regla["ttl"])
        if diff <= 8:
            score += 3
        elif diff <= 16:
            score += 1
    ventana = flujo.tcp_window_promedio
    if ventana and any(abs(ventana - ref) <= 512 for ref in regla.get("window", [])):
        score += 3
    mss = flujo.tcp_mss
    if mss and mss in regla.get("mss", set()):
        score += 2
    opciones = set(op.strip().lower() for op in (flujo.tcp_opciones or "").split(",") if op)
    if opciones:
        inter = opciones & regla.get("options", set())
        if inter:
            score += min(len(inter), 3)
    prob = min(0.2 + score * 0.1, 0.95)
    return score, prob


def generar_fingerprints_para_sesion(sesion: CapturaSesion) -> int:
    """
    Recorre flujos con dispositivos asociados y genera observaciones pasivas
    usando reglas heurísticas basadas en TTL, ventana TCP, MSS y opciones.
    Devuelve la cantidad de observaciones creadas.
    """
    from captura.models import CapturaFlujo  # import diferido para evitar ciclos

    creados = 0
    flujos = (
        CapturaFlujo.objects.filter(sesion=sesion)
        .select_related("dispositivo_origen", "dispositivo_destino")
        .order_by("-ventana_fin")
    )

    cache_ultimo = {}

    for flujo in flujos:
        dispositivo = flujo.dispositivo_origen or flujo.dispositivo_destino
        if not dispositivo:
            continue

        mejor_regla = None
        mejor_score = 0
        mejor_prob = 0.0

        for regla in FINGERPRINT_RULES:
            score, prob = _score_rule(flujo, regla)
            if score > mejor_score:
                mejor_score = score
                mejor_regla = regla
                mejor_prob = prob

        if not mejor_regla or mejor_score < 3:
            continue

        last_obs = cache_ultimo.get(dispositivo.id)
        if last_obs is None:
            last_obs = (
                FingerprintObservacion.objects.filter(dispositivo=dispositivo)
                .order_by("-timestamp")
                .first()
            )
            cache_ultimo[dispositivo.id] = last_obs

        if last_obs:
            if (
                last_obs.sistema_estimado == mejor_regla["sistema"]
                and (last_obs.probabilidad or 0) >= mejor_prob
            ):
                continue

        nueva_obs = FingerprintObservacion.objects.create(
            sesion=sesion,
            dispositivo=dispositivo,
            metodo="pasivo",
            sistema_estimado=mejor_regla["sistema"],
            version_estimado="",
            probabilidad=mejor_prob,
            evidencia={
                "ttl_promedio": flujo.ttl_promedio,
                "tcp_window_promedio": flujo.tcp_window_promedio,
                "tcp_mss": flujo.tcp_mss,
                "tcp_opciones": flujo.tcp_opciones,
                "direccion": flujo.direccion,
            },
        )
        creados += 1
        cache_ultimo[dispositivo.id] = nueva_obs  # evita queries repetidas

    return creados


def validar_con_p0f(sesion: CapturaSesion) -> int:
    """
    Si p0f está instalado y la sesión tiene un PCAP asociado, ejecuta p0f
    para validar/entrenar nuestras heurísticas. Se guardan las observaciones
    con metodo='p0f' para auditar diferencias.
    """
    if not sesion.ruta_pcap or not os.path.exists(sesion.ruta_pcap):
        return 0
    p0f_bin = shutil.which("p0f")
    if not p0f_bin:
        return 0

    try:
        result = subprocess.run(
            [p0f_bin, "-r", sesion.ruta_pcap, "-q"],
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except Exception:
        return 0

    lines = result.stdout.splitlines()
    if not lines:
        return 0

    from detector.models import Dispositivo  # import tardío

    observaciones = 0
    for line in lines:
        if "cli=" not in line and "srv=" not in line:
            continue
        data = _parse_p0f_line(line)
        if not data:
            continue
        ip = data.get("cli") or data.get("srv")
        if not ip:
            continue
        dispositivo = Dispositivo.objects.filter(ip=ip).first()
        if not dispositivo:
            continue
        FingerprintObservacion.objects.create(
            sesion=sesion,
            dispositivo=dispositivo,
            metodo="p0f",
            sistema_estimado=data.get("os") or "Desconocido",
            version_estimado="",
            probabilidad=0.9,
            evidencia=data,
        )
        observaciones += 1

    return observaciones


def _parse_p0f_line(line: str) -> Dict[str, str]:
    """
    p0f imprime líneas tipo:
    [timestamp] mod=...|cli=ip/puerto|srv=ip/puerto|subj=cli|os=Windows|dist=12|params=...
    Esta función devuelve un diccionario simplificado.
    """
    if "|" not in line:
        return {}
    partes = line.strip().split("|")
    data: Dict[str, str] = {}
    for fragmento in partes[1:]:
        if "=" not in fragmento:
            continue
        clave, valor = fragmento.split("=", 1)
        if clave in {"cli", "srv"}:
            valor = valor.split("/", 1)[0]
        data[clave.strip()] = valor.strip()
    return data
