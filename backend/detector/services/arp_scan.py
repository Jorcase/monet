import time #para medir latencia de cada rta
from typing import Iterable

from scapy.all import ARP, Ether, srp
from ipaddress import IPv4Network, IPv4Address

def perform_arp_scan(
    network: IPv4Network,
    interface: str,
    *, #keyword-only
    local_ip: IPv4Address | None = None,
    timeout: int = 2,
    retry: int = 0,
) -> list[dict]:
    
    if not isinstance(network,IPv4Network):
        raise TypeError("network debe ser un IPv4Network")

    arp = ARP(pdst=str(network))
    ether = Ether(dst="ff:ff:ff:ff:ff:ff")
    packet = ether / arp   #construccion de paquetes por capas

    try:
        start = time.time()
        answered, _ = srp(
            packet,
            timeout=timeout,
            iface = interface,
            retry = retry,
            verbose=False,
        ) 
        elapsed_ms = (time.time() - start) * 1000
    except PermissionError as exc:
        raise RuntimeError("Se requieren privilegios para enviar ARP") from exc
    except OSError as exc:
        raise RuntimeError(f"No se pudo ejecutar el barrido ARP: {exc}") from exc
    
    seen_ips = set()
    if local_ip:
        seen_ips.add(str(local_ip))
    seen_ips.add(str(network.broadcast_address))

    resultados = []
    for _, reply in answered:
        ip_respuesta = reply.psrc

        if ip_respuesta in seen_ips:
            continue
        seen_ips.add(ip_respuesta)
        resultados.append(
            {
                "ip": ip_respuesta,
                "mac": reply.hwsrc,
                "latencia_ms": round(elapsed_ms,2),
                "metodo": "arp",
            }
        )

    return resultados