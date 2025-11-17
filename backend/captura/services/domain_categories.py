from functools import lru_cache

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from captura.models import DominioCategoria

DOMAIN_CATEGORIES_DEFAULT = {
    "redes_sociales": [
        "facebook.com",
        "instagram.com",
        "whatsapp.com",
        "whatsapp.net",
        "tiktok.com",
        "twitter.com",
        "x.com",
        "snapchat.com",
    ],
    "apuestas": [
        "bet365.bet.ar",
        "codere.bet.ar",

    ],
    "streaming": [
        "netflix.com",
        "netflix.net",
        "disneyplus.com",
        "primevideo.com",
        "spotify.com",
        "play.hbomax.com",
        "youtube.com",
    ],
}

# IPs conocidas de resolvers DoH/DoT (heurística básica; editable vía BD a futuro).
RESOLVER_DOH_DOT = {
    "1.1.1.1",
    "1.0.0.1",
    "8.8.8.8",
    "8.8.4.4",
    "9.9.9.9",
    "149.112.112.112",
    "208.67.222.222",
    "208.67.220.220",
    "94.140.14.14",
    "94.140.15.15",
}


def _load_db_categories():
    from django.db.utils import OperationalError, ProgrammingError

    try:
        registros = DominioCategoria.objects.filter(activo=True).values_list("sufijo", "categoria")
    except (OperationalError, ProgrammingError):
        return {}
    data = {}
    for sufijo, categoria in registros:
        suf = (sufijo or "").lower().strip()
        if not suf:
            continue
        data.setdefault(categoria, []).append(suf)
    return data


@lru_cache(maxsize=512)
def categorize_domain(host: str) -> str:
    if not host:
        return ""
    host_l = host.lower()
    # Primero BD
    db_map = _load_db_categories()
    for category, suffixes in db_map.items():
        for suffix in suffixes:
            if host_l.endswith(suffix):
                return category
    # Luego defaults
    for category, suffixes in DOMAIN_CATEGORIES_DEFAULT.items():
        for suffix in suffixes:
            if host_l.endswith(suffix):
                return category
    return ""


def is_doh_resolver(ip: str) -> bool:
    return ip in RESOLVER_DOH_DOT


@receiver([post_save, post_delete], sender=DominioCategoria)
def _clear_domain_category_cache(**kwargs):
    """
    Invalida el cache de categorización cuando se crean/actualizan/eliminan sufijos.
    Esto permite que las categorías personalizadas impacten inmediatamente en nuevos flujos.
    """
    categorize_domain.cache_clear()
