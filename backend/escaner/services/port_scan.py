from __future__ import annotations
from typing import Iterable
import re
import nmap

def _build_target_list(targets: Iterable[str]) -> str:
    return " ".join(targets)# Lista iterable de objetivos en una cadena separada por espacios que es el formato que espera nmap.porscanner.scan

def normalize_port_list(cadena: str) -> str:
    tokens = re.split(r"[,\s]+", cadena.strip())
    cleaned: list[str] = []
    for token in tokens:
        if not token:
            continue
        if "-" in token:
            inicio, fin = token.split("-", 1)
            if not inicio.isdigit() or not fin.isdigit():
                raise ValueError("Los rangos deben usar números (ej. 8000-8100).")
            start = int(inicio)
            end = int(fin)
            if start < 1 or end > 65535 or start > end:
                raise ValueError("Rango de puertos fuera de 1-65535 o invertido.")
            cleaned.append(f"{start}-{end}")
        else:
            if not token.isdigit():
                raise ValueError("Puertos personalizados deben separarse por comas/espacios.")
            numero = int(token)
            if numero < 1 or numero > 65535:
                raise ValueError("Los puertos deben estar entre 1 y 65535.")
            cleaned.append(str(numero))
    if not cleaned:
        raise ValueError("Ingresá al menos un puerto válido.")
    return ",".join(cleaned)


def run_port_scan(
        targets: Iterable[str],
        *,
        tipo: str,
        timeout: int | None = None,
        puertos: str | None = None,
) -> tuple[list[dict[str,str | int]], dict [str,int]]:

    nm = nmap.PortScanner()
    target_str = _build_target_list(targets)

    if tipo == "rapido":
        argumentos = "-T4 --top-ports 100"
    elif tipo == "tcp-1000":
        argumentos = "-T4 -p 1-1000"
    elif tipo == "tcp-completo":
        argumentos = "-T4 -p-"
    elif tipo == "personalizado":
        if not puertos:
            raise ValueError("Debés indicar los puertos personalizados a escanear.")
        # usamos la lista previamente normalizada (ej. "22,80,443,8000-8100")
        argumentos = f"-T4 -p {puertos}"
    else:
        raise ValueError(f"Tipo de scan desconocido: {tipo}")
    
    nm.scan(hosts=target_str, arguments=argumentos, timeout=timeout)

    resultados: list[dict[str, str | int]] = []
    resumen = {"abierto": 0, "cerrado": 0, "filtrado": 0}
    estado_map = {
        "open": "abierto",
        "closed": "cerrado",
        "filtered": "filtrado",
        "open|filtered": "filtrado",
        "closed|filtered": "filtrado",
        "unfiltered": "filtrado",
    }

    incluir_cerrados = tipo == "personalizado"

    for host in nm.all_hosts():
        for proto in nm[host].all_protocols():
            for port, info in nm[host][proto].items():
                estado_raw = info.get("state", "desconocido")
                estado = estado_map.get(estado_raw, estado_raw)
                if estado in resumen:
                    resumen[estado] += 1
                guardar = estado == "abierto" or estado == "filtrado" or (estado == "cerrado" and incluir_cerrados)
                if not guardar:
                    continue
                servicio = info.get("name", "")
                resultados.append(
                    {
                        "host": host,
                        "puerto": port,
                        "protocolo": proto,
                        "estado": estado,
                        "servicio": servicio,
                    }
                )
    return resultados, resumen
