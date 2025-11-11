from __future__ import annotations

from ipaddress import ip_address
from typing import List, Optional

try:
    from scapy.layers.dhcp import DHCP, BOOTP
    from scapy.layers.dns import DNS, DNSRR
    from scapy.layers.inet import IP
    from scapy.layers.l2 import Ether
except ImportError:  # pragma: no cover
    DHCP = BOOTP = DNS = DNSRR = IP = Ether = None  # type: ignore


PRIVATE_NETWORKS = ("10.", "172.", "192.168.")


def _is_private_ip(value: str | bytes | None) -> bool:
    if not value:
        return False
    if isinstance(value, bytes):
        value = value.decode(errors="ignore")
    try:
        return ip_address(value).is_private
    except ValueError:
        return False


def _sanitize_hostname(value: str | bytes | None) -> Optional[str]:
    if not value:
        return None
    if isinstance(value, bytes):
        try:
            value = value.decode("utf-8", errors="ignore")
        except Exception:  # pragma: no cover
            value = value.decode(errors="ignore")
    value = value.strip().strip(".")
    if not value:
        return None
    return value[:255]


def extract_hostname_events(packet) -> List[dict]:
    eventos: List[dict] = []

    if DHCP and packet.haslayer(DHCP):
        dhcp_layer = packet.getlayer(DHCP)
        hostname = None
        for opt in dhcp_layer.options:
            if isinstance(opt, tuple) and opt[0] == "hostname":
                hostname = _sanitize_hostname(opt[1])
                break
        if hostname:
            ip_val = None
            if packet.haslayer(BOOTP):
                bootp = packet.getlayer(BOOTP)
                ip_val = bootp.yiaddr or bootp.ciaddr
            if not ip_val and packet.haslayer(IP):
                ip_val = packet[IP].src
            mac = packet[Ether].src if Ether and packet.haslayer(Ether) else None
            eventos.append({"ip": ip_val, "hostname": hostname, "mac": mac, "source": "dhcp"})

    if DNS and packet.haslayer(DNS):
        dns = packet.getlayer(DNS)
        # respuestas
        if dns.qr == 1 and dns.ancount:
            answer = dns.an
            answers = []
            if answer:
                answers.append(answer)
                while answer.payload and isinstance(answer.payload, DNSRR):
                    answer = answer.payload
                    answers.append(answer)
            for rr in answers:
                if isinstance(rr, DNSRR) and rr.type == 1:
                    ip_val = rr.rdata
                    if isinstance(ip_val, bytes):
                        ip_val = ip_val.decode(errors="ignore")
                    if _is_private_ip(ip_val):
                        hostname = _sanitize_hostname(rr.rrname)
                        if hostname:
                            eventos.append(
                                {
                                    "ip": ip_val,
                                    "hostname": hostname,
                                    "mac": None,
                                    "source": "dns",
                                }
                            )
        # consultas mDNS
        elif dns.qr == 0 and dns.qdcount and packet.haslayer(IP):
            qname = dns.qd.qname if dns.qd else None
            hostname = _sanitize_hostname(qname)
            if hostname and hostname.endswith("local"):
                eventos.append(
                    {
                        "ip": packet[IP].src,
                        "hostname": hostname,
                        "mac": packet[Ether].src if Ether and packet.haslayer(Ether) else None,
                        "source": "mdns",
                    }
                )

    return eventos
