import ipaddress
from typing import NamedTuple

from agente.models import AgenteLocal

class NetworkSnapshot(NamedTuple):
    network: ipaddress.IPv4Network
    ip_local: ipaddress.IPv4Address
    interfaz: str
    mac: str

def get_local_network() -> NetworkSnapshot: #es como un return entonces? 
    agente =  AgenteLocal.objects.order_by("-ultima_actualizacion").first()
    if not agente:
        raise  RuntimeError("No hay informacion del agente local.")
    network = ipaddress.ip_network(f"{agente.ip_local}/{agente.cidr}", strict=False)#que es esto 
    return NetworkSnapshot(
        network=network,
        ip_local=ipaddress.ip_address(agente.ip_local),
        interfaz=agente.interfaz,
        mac=agente.mac,
    )


