from __future__ import annotations

import socket
import time
from typing import Dict, Tuple

from captura.models import CapturaAccionActiva, CapturaSesion


def _tcp_probe(objetivo: str, puerto: int, payload: str, timeout: float) -> Dict[str, object]:
    inicio = time.perf_counter()
    data = payload.encode() if payload else b""
    estado = "desconocido"
    detalle = ""
    try:
        sock = socket.create_connection((objetivo, puerto), timeout=timeout)
        estado = "open"
        if data:
            sock.sendall(data)
            detalle = "payload_enviado"
        sock.close()
    except socket.timeout:
        estado = "timeout"
    except ConnectionRefusedError:
        estado = "refused"
    except OSError as exc:
        estado = "error"
        detalle = str(exc)
    finally:
        elapsed_ms = (time.perf_counter() - inicio) * 1000
    return {
        "protocolo": "tcp",
        "estado": estado,
        "detalle": detalle,
        "latencia_ms": round(elapsed_ms, 2),
    }


def _udp_probe(objetivo: str, puerto: int, payload: str, timeout: float) -> Dict[str, object]:
    inicio = time.perf_counter()
    data = payload.encode() if payload else b"ping"
    estado = "desconocido"
    detalle = ""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        sock.sendto(data, (objetivo, puerto))
        sock.recvfrom(2048)
        estado = "open"
        detalle = "respuesta_recibida"
    except socket.timeout:
        estado = "sin-respuesta"
    except ConnectionRefusedError:
        estado = "refused"
    except OSError as exc:
        estado = "error"
        detalle = str(exc)
    finally:
        sock.close()
        elapsed_ms = (time.perf_counter() - inicio) * 1000
    return {
        "protocolo": "udp",
        "estado": estado,
        "detalle": detalle,
        "latencia_ms": round(elapsed_ms, 2),
    }


def run_active_probe(
    sesion: CapturaSesion,
    *,
    tipo: str,
    objetivo: str,
    puerto: int,
    payload: str = "",
    timeout: float = 3.0,
) -> CapturaAccionActiva:
    if tipo == "tcp_syn":
        resultado = _tcp_probe(objetivo, puerto, payload, timeout)
    elif tipo == "udp_probe":
        resultado = _udp_probe(objetivo, puerto, payload, timeout)
    else:
        raise ValueError(f"Tipo de acción no soportado: {tipo}")

    accion = CapturaAccionActiva.objects.create(
        sesion=sesion,
        tipo=tipo,
        objetivo=objetivo,
        puerto=puerto,
        payload=payload,
        resultado=resultado,
        exitoso=resultado.get("estado") in {"open", "respuesta_recibida"},
    )
    return accion
