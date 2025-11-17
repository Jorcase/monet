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
from django.utils import timezone
from datetime import datetime


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
    timeout: int = 2,
    retry: int = 0,
    attempts: Optional[int] = None,
    rest: float = 0.0,
) -> list[dict]:
    
    if not isinstance(network,IPv4Network):
        raise TypeError("network debe ser un IPv4Network")
    global ARP, Ether, srp, SCAPY_IMPORT_ERROR
    if ARP is None or Ether is None or srp is None:
        try:
            from scapy.all import ARP as _ARP, Ether as _Ether, srp as _srp
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("Scapy no esta disponible, ejecute con permisos o instale dependencias.") from exc
        else:
            ARP, Ether, srp = _ARP, _Ether, _srp
            SCAPY_IMPORT_ERROR = None

    arp = ARP(pdst=str(network)) 
    ether = Ether(dst="ff:ff:ff:ff:ff:ff") #broadcast
    packet = ether / arp   #construccion de paquetes 

    answered_total = []
    start_global = time.time()
    max_attempts = attempts or 1

    for _ in range(max_attempts):
        try:
            answered, _ = srp( #send receive
                packet,
                timeout=timeout,
                iface=interface,
                retry=retry,
                verbose=False, #print de progreso de scapy desactivados
            )
            answered_total.extend(answered)
        except PermissionError as exc:
            raise RuntimeError("Se requieren privilegios para enviar ARP") from exc
        except OSError as exc:
            raise RuntimeError(f"No se pudo ejecutar el barrido ARP: {exc}") from exc
        if rest > 0:
            time.sleep(rest)

    elapsed_ms = (time.time() - start_global) * 1000
    
    skip_ips = set()
    if local_ip:
        skip_ips.add(str(local_ip))
    skip_ips.add(str(network.broadcast_address))#ips que no seran tenidas en cuenta

    resultados = {}

    if local_ip is None:
        socket.setdefaulttimeout(1)

    for enviado, reply in answered_total:
        ip_respuesta = reply.psrc #funcion de scpy

        if ip_respuesta in skip_ips:
            continue

        mac_respuesta = reply.hwsrc.lower()
        mac_random = es_mac_aleatoria(mac_respuesta)

        latencia_individual = None
        if hasattr(enviado, "sent_time") and hasattr(reply, "time"):
            latencia_individual = (reply.time - enviado.sent_time) * 1000
        elif hasattr(reply, "time"):
            latencia_individual = (reply.time - start) * 1000


        hostname = resolve_hostname(ip_respuesta)

        timestamp = None
        reply_time = getattr(reply, "time", None)
        if reply_time:
            timestamp = timezone.make_aware(datetime.fromtimestamp(reply_time))#conversion a datetime del reply time
        else:
            timestamp = timezone.now()
        #actualizacion de primera y ultima vez
        if ip_respuesta in resultados:
            entry = resultados[ip_respuesta]
            if timestamp < entry["first_seen"]:
                entry["first_seen"] = timestamp
            if timestamp > entry["last_seen"]:
                entry["last_seen"] = timestamp
            continue

        resultados[ip_respuesta] = {
            "ip": ip_respuesta,
            "mac": mac_respuesta,
            "latencia_ms": round(latencia_individual, 2) if latencia_individual is not None else None,
            "metodo": "arp",
            "hostname": hostname,
            "mac_aleatoria": mac_random,
            "first_seen": timestamp,
            "last_seen": timestamp,
        }

    return list(resultados.values()), elapsed_ms
