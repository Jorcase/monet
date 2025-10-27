import time #para medir latencia de cada rta
import socket

from scapy.all import ARP, Ether, srp
from ipaddress import IPv4Network, IPv4Address
from detector.services.hostname import resolve_hostname


def es_mac_aleatoria(mac: str) -> bool:
    try:
        primer_octeto = int(mac.split(":")[0],16)
    except (ValueError, IndexError):
        return False
    return bool(primer_octeto & 0b10)
    
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

    if local_ip is None:
        socket.setdefaulttimeout(1)

    for enviado, reply in answered:
        ip_respuesta = reply.psrc

        mac_respuesta = reply.hwsrc
        mac_random = es_mac_aleatoria(mac_respuesta)

        latencia_individual = None
        if hasattr(enviado, "sent_time") and hasattr(reply, "time"):
            latencia_individual = (reply.time - enviado.sent_time) * 1000
        elif hasattr(reply, "time"):
            latencia_individual = (reply.time - start) * 1000


        hostname = resolve_hostname(ip_respuesta)
    
    
        if ip_respuesta in seen_ips:
            continue
        seen_ips.add(ip_respuesta)
        resultados.append(
            {
                "ip": ip_respuesta,
                "mac": mac_respuesta,
                "latencia_ms": round(latencia_individual, 2) if latencia_individual is not None else None,
                "metodo": "arp",
                "hostname": hostname,
                "mac_aleatoria": mac_random,
            }
        )

    return resultados, elapsed_ms