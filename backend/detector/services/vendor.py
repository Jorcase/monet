
from netaddr import EUI, NotRegisteredError

def resolve_vendor(mac: str) -> str:

    if not mac:
        return ""
    try:
        empresa = EUI(mac).oui.registration().org
    except (ValueError, NotRegisteredError):
        return ""
    return empresa or ""
