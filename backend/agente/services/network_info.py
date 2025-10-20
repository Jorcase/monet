import socket
import ipaddress
import psutil

def collect_network_snapshot(interface_preferida: str | None = None) -> dict[str, str]:
    hostname = socket.gethostname()

    interfaces = psutil.net_if_addrs()
    if  interface_preferida:
        candidatos = [(interface_preferida, interfaces.get(interface_preferida, []))]
    else:
        candidatos = interfaces.items()
    
    for nombre_interfaz, direcciones in candidatos:
        ipv4 =  next((addr for addr in direcciones if addr.family == socket.AF_INET), None)
        mac = next((addr for addr in direcciones if addr.family == psutil.AF_LINK), None)

        if ipv4 and ipv4.address != "127.0.0.1":
            ip_iface = ipaddress.ip_interface(f"{ipv4.address}/{ipv4.netmask}")
            return {
                "interfaz": nombre_interfaz,
                "ip_local": str(ip_iface.ip),
                "cidr": ip_iface.network.prefixlen,
                "mac": mac.address if mac else "",
                "hostname": socket.getfqdn(hostname),
            }
        
    raise RuntimeError("No se encontro una interfaz IPv4 valida.")