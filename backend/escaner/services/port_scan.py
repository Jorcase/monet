from __future__ import annotations
from typing import Iterable
import nmap

def _build_target_list(targets: Iterable[str]) -> str:
    return " ".join(targets)

def run_port_scan(
        targets: Iterable[str],
        *,
        tipo: str,
        timeout: int | None = None,
) -> tuple[list[dict[str,str | int]], dict [str,int]]:

    nm = nmap.PortScanner()
    target_str = _build_target_list(targets)

    if tipo == "rapido":
        argumentos = "-T4 --top-ports 100"
    elif tipo == "tcp-1000":
        argumentos = "-T4 -p 1-1000"
    elif tipo == "tcp-completo":
        argumentos = "-T4 -p-"
    else:
        raise ValueError(f"Tipo de scan desconocido: {tipo}")
    
    nm.scan(hosts=target_str, arguments=argumentos, timeout=timeout)

    resultados: list[dict[str, str | int]] = []
    resumen = {"abierto": 0, "cerrado": 0, "filtrado": 0}

    for host in nm.all_hosts():
        for proto in nm[host].all_protocols():
            for port, info in nm[host][proto].items():
                estado = info.get("state", "desconocido")
                if estado in resumen:
                    resumen[estado] += 1
                if estado != "abierto":
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
