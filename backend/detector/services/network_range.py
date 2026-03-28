import ipaddress
from typing import NamedTuple

from agente.models import AgenteLocal

class NetworkSnapshot(NamedTuple):
    network: ipaddress.IPv4Network
    ip_local: ipaddress.IPv4Address
    interfaz: str
    mac: str
    hostname: str

def get_local_network() -> NetworkSnapshot: 
    agente =  AgenteLocal.objects.order_by("-ultima_actualizacion").first()
    if not agente:
        raise  RuntimeError("No hay informacion del agente local.")
    network = ipaddress.ip_network(f"{agente.ip_local}/{agente.cidr}", strict=False)#que es esto 
    return NetworkSnapshot(
        network=network,
        ip_local=ipaddress.ip_address(agente.ip_local),
        interfaz=agente.interfaz,
        mac=agente.mac,
        hostname=agente.hostname,
    )


def build_local_host_entry(snapshot: NetworkSnapshot) -> dict:
    return {
        "ip": str(snapshot.ip_local),
        "mac": snapshot.mac.lower() if snapshot.mac else "",
        "latencia_ms": 0,
        "metodo": "agente",
        "hostname": snapshot.hostname,
        "mac_aleatoria": False,
    }

