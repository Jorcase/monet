
from netaddr import EUI, NotRegisteredError
from scapy.config import conf


def resolve_vendor(mac: str) -> str:

    if not mac:
        return ""

    try:
        empresa = EUI(mac).oui.registration().org
        if empresa:
            return empresa
    except (ValueError, NotRegisteredError):
        pass
    except Exception:
        # netaddr puede levantar IOError si no encuentra los índices
        pass

    try:
        manuf = conf.manufdb._get_manuf(mac)
        if manuf and manuf != mac:
            return manuf
    except Exception:
        pass

    return ""
