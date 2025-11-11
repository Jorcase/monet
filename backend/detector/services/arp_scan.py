import time #para medir latencia de cada rta
import socket
from typing import Optional
#para poder correr comando de django sin sudo asi no genera errores
try:
    from scapy.all import ARP, Ether, srp
except Exception:  # pragma: no cover - se maneja dinámicamente
    ARP = Ether = srp = None  # type: ignore
    SCAPY_IMPORT_ERROR: Optional[Exception] = Exception("Scapy no disponible")
else:
    SCAPY_IMPORT_ERROR = None
from ipaddress import IPv4Network, IPv4Address
from detector.services.hostname import resolve_hostname


def es_mac_aleatoria(mac: str) -> bool:
    try:
        primer_octeto = int(mac.split(":")[0],16) #convierte la cadena en ["7c", "10", "c9", "45", "6b", "65"] y luego indica en que base(16)
    except (ValueError, IndexError):
        return False
    return bool(primer_octeto & 0b10)
    
def perform_arp_scan(
    network: IPv4Network,
    interface: str,
    *,  
    local_ip: IPv4Address | None = None,
    timeout: int = 2,   #por el momento espera 2 segundos respuestas ARP
    retry: int = 0,     #intentos
) -> list[dict]:
    
    if not isinstance(network,IPv4Network):
        raise TypeError("network debe ser un IPv4Network")
    global ARP, Ether, srp, SCAPY_IMPORT_ERROR
    if ARP is None or Ether is None or srp is None:
        try:
            from scapy.all import ARP as _ARP, Ether as _Ether, srp as _srp
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("Scapy no está disponible, ejecute con permisos o instale dependencias.") from exc
        else:
            ARP, Ether, srp = _ARP, _Ether, _srp
            SCAPY_IMPORT_ERROR = None

    arp = ARP(pdst=str(network)) # se elige el rango a descubrir
    ether = Ether(dst="ff:ff:ff:ff:ff:ff") #broadcast
    packet = ether / arp   #construccion de paquetes 

    try:
        start = time.time()
        answered, _ = srp( #(paquete_enviado, respuesta_recibida)
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

    for enviado, reply in answered: #(paquete_enviado, respuesta_recibida)
        ip_respuesta = reply.psrc

        mac_respuesta = reply.hwsrc.lower()
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
