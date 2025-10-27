import socket
import subprocess

def _reverse_dns(ip: str, timeout: float = 1.0) -> str:
    socket.setdefaulttimeout(timeout)
    try:
        return socket.gethostbyaddr(ip)[0]
    except (socket.herror, socket.gaierror, TimeoutError, OSError):
        return ""


def _nbns_lookup(ip: str, timeout: float = 1.0) -> str:

    try:
        resultado = subprocess.run(
            ["nmblookup", "-A", ip],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (FileNotFoundError, subprocess.SubprocessError, TimeoutError):
        return ""

    if resultado.returncode != 0:
        return ""

    for linea in resultado.stdout.splitlines():
        linea = linea.strip()
        # Lineas con el nombre tienen el formato "<NOMBRE> <SUFIJO> <FLAG>"
        if linea and linea.endswith("<ACTIVE>"):
            partes = linea.split(" ")
            if partes:
                nombre = partes[0].strip()
                if nombre and nombre != "*":
                    return nombre
    return ""


def resolve_hostname(ip: str) -> str:

    hostname = _reverse_dns(ip)
    if hostname:
        return hostname

    return _nbns_lookup(ip)
