from __future__ import annotations

import shutil
import subprocess
from typing import Iterable, Optional

from django.utils import timezone

from detector.models import Dispositivo


def _run_nmap_os(ip: str, timeout: int = 60) -> Optional[dict]:
    nmap_bin = shutil.which("nmap") #usamos el nmap del sistema, a futuro cambiar a la libreria de nmap
    if not nmap_bin:
        return None

    try:
        result = subprocess.run(
            [nmap_bin, "-O", "-Pn", "--osscan-limit", "--max-os-tries", "1", ip],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except Exception:
        return None

    if result.returncode not in {0, 1}:  # 1 == general non-fatal error
        return None

    os_name = None
    accuracy = None

    for line in result.stdout.splitlines():
        line = line.strip()
        if line.lower().startswith("os details:"):
            os_name = line.split(":", 1)[1].strip()
            break
        if line.lower().startswith("os guesses:") and not os_name:
            os_name = line.split(":", 1)[1].strip().split(",")[0]
        if "accuracy" in line.lower() and "%" in line:
            try:
                accuracy = int(line.split("%")[0].split()[-1])
            except Exception:
                accuracy = None

    if not os_name:
        return None
    return {"os": os_name, "accuracy": accuracy}


def fingerprint_hosts_with_nmap(hosts: Iterable[dict], owner=None) -> None:
    for host in hosts:
        ip = host.get("ip")
        if not ip:
            continue
        mac = (host.get("mac") or "").lower()
        dispositivo = None
        if mac:
            dispositivo = Dispositivo.objects.filter(mac=mac).first()
        if not dispositivo:
            dispositivo = Dispositivo.objects.filter(ip=ip).order_by("-ultima_vez").first()
        if not dispositivo:
            continue

        result = _run_nmap_os(ip)
        if not result:
            continue

        dispositivo.sistema_operativo = result["os"]
        dispositivo.fuente_fingerprint = "nmap"
        dispositivo.ultima_fingerprint = timezone.now()
        dispositivo.save(update_fields=["sistema_operativo", "fuente_fingerprint", "ultima_fingerprint"])
