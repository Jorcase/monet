from django.apps import AppConfig


class CapturaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'captura'

    def ready(self) -> None:
        # Registra receptores de señales (cache de dominios, etc.)
        from captura.services import domain_categories  # noqa: F401
        return super().ready()
