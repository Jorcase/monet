from django.core.management.base import BaseCommand, CommandError

from config.ownership import OwnerResolutionError, resolve_owner
from analitica.services import evaluar_reglas_para_captura, evaluar_reglas_globales
from captura.models import CapturaSesion


class Command(BaseCommand):
    help = "Ejecuta las reglas de analítica sobre capturas recientes y reglas globales."

    def add_arguments(self, parser):
        parser.add_argument(
            "--captura-id",
            type=int,
            help="ID específico de la sesión de captura a evaluar.",
        )
        parser.add_argument(
            "--owner",
            help="Ejecutar heurísticas sólo para el usuario indicado.",
        )

    def handle(self, *args, **options):
        captura_id = options.get("captura_id")
        owner_username = options.get("owner")
        owner = None
        if owner_username:
            try:
                owner = resolve_owner(owner_username)
            except OwnerResolutionError as exc:
                raise CommandError(str(exc))
        eventos_generados = 0

        if captura_id:
            sesion = CapturaSesion.objects.filter(id=captura_id).first()
            if not sesion:
                self.stdout.write(self.style.ERROR("La sesión indicada no existe."))
                return
            if owner and sesion.owner_id != owner.id:
                self.stdout.write(self.style.WARNING("La sesión indicada no pertenece al usuario seleccionado."))
                return
            eventos_generados += evaluar_reglas_para_captura(sesion, owner=owner)
        else:
            qs = CapturaSesion.objects.order_by("-inicio")[:5]
            if owner:
                qs = qs.filter(owner=owner)
            for sesion in qs:
                eventos_generados += evaluar_reglas_para_captura(sesion, owner=owner)

        eventos_generados += evaluar_reglas_globales(owner=owner)
        self.stdout.write(self.style.SUCCESS(f"Eventos generados: {eventos_generados}"))
