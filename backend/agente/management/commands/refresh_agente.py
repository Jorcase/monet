from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from agente.models import AgenteLocal
from agente.services.network_info import collect_network_snapshot

class Command(BaseCommand):
    help = "Detecta la informacion local de red y la guarda en AgenteLocal"

    def add_arguments(self, parser):
        parser.add_argument("--interface", help="Forzar una interfaz")
    
    def handle(self, *args, **options):
        try:
            snapshot = collect_network_snapshot(interface_preferida=options["interface"])
        except RuntimeError as exc:
            raise CommandError(str(exc))

        obj, created = AgenteLocal.objects.update_or_create(
            mac=snapshot["mac"],
            defaults={
                **snapshot,
                "ultima_actualizacion": timezone.now(),
            },
        )
        mensaje = "creado" if created else "actualizado"
        self.stdout.write(self.style.SUCCESS(f"Registro {mensaje}: {obj}"))
