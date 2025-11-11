from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model


class OwnerResolutionError(RuntimeError):
    """Se lanza cuando no se puede determinar un usuario propietario."""


def resolve_owner(username: str | None = None, required: bool = True):
    """
    Devuelve el usuario que se usará como propietario de los registros.

    Prioridad:
    1. `username` provisto explícitamente.
    2. `settings.DEFAULT_OWNER_USERNAME`.
    3. Primer usuario existente (orden por ID ascendente).
    """

    User = get_user_model()
    candidate_usernames: list[str] = []

    if username:
        candidate_usernames.append(username)
    elif settings.DEFAULT_OWNER_USERNAME:
        candidate_usernames.append(settings.DEFAULT_OWNER_USERNAME)

    for candidate in candidate_usernames:
        try:
            return User.objects.get(username=candidate)
        except User.DoesNotExist:
            continue

    owner = User.objects.order_by("id").first()
    if owner or not required:
        return owner

    raise OwnerResolutionError(
        "No se encontró ningún usuario para asociar los registros. "
        "Creá un usuario (python manage.py createsuperuser) o usa --owner."
    )
