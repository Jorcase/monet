import os
from typing import Optional

try:
    from pysnmp.hlapi import (
        SnmpEngine,
        CommunityData,
        UdpTransportTarget,
        ContextData,
        ObjectType,
        ObjectIdentity,
        getCmd,
    )
except Exception:  # pragma: no cover
    SnmpEngine = None  # type: ignore


def snmp_printer_info(ip: str, community: str = "public", timeout: int = 2, retries: int = 1) -> Optional[str]:

    if not ip or SnmpEngine is None:
        return None

    try:
        iterator = getCmd(
            SnmpEngine(),
            CommunityData(community),
            UdpTransportTarget((ip, 161), timeout=timeout, retries=retries),
            ContextData(),
            ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")),  # sysDescr
        )
        errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
        if errorIndication or errorStatus:
            return None
        if varBinds:
            return str(varBinds[0][1])
    except Exception:
        return None
    return None


def snmp_enabled() -> bool:
    return SnmpEngine is not None and os.environ.get("MONET_SNMP_PRINTER", "0") == "1"
