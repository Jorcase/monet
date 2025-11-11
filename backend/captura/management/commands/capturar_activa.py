from __future__ import annotations

from typing import List

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from config.ownership import OwnerResolutionError, resolve_owner
from captura.models import CapturaSesion
from captura.services import (
    create_capture_session,
    mark_session_state,
    run_active_probe,
)


class Command(BaseCommand):
    help = "Ejecuta sondas activas (TCP/UDP) contra un objetivo y registra los resultados."

    def add_arguments(self, parser):
        parser.add_argument("--interfaz", required=True, help="Interfaz de referencia (solo para registro).")
        parser.add_argument("--objetivo", required=True, help="IP o hostname a probar.")
        parser.add_argument(
            "--puertos",
            help="Lista de puertos separada por comas (ej. 22,80,443). Default: 80",
            default="80",
        )
        parser.add_argument(
            "--tipo",
            choices=["tcp_syn", "udp_probe"],
            default="tcp_syn",
            help="Tipo de prueba activa.",
        )
        parser.add_argument(
            "--payload",
            default="",
            help="Payload opcional para enviar en la sonda.",
        )
        parser.add_argument(
            "--timeout",
            type=float,
            default=3.0,
            help="Timeout en segundos para cada sonda.",
        )
        parser.add_argument(
            "--owner",
            help="Nombre de usuario al que se asociará la captura activa.",
        )

    def handle(self, *args, **options):
        interfaz = options["interfaz"]
        objetivo = options["objetivo"]
        tipo = options["tipo"]
        payload = options["payload"]
        timeout = options["timeout"]

        try:
            puertos = self._parse_ports(options["puertos"])
        except ValueError as exc:
            raise CommandError(str(exc))

        owner_username = options.get("owner")
        try:
            owner = resolve_owner(owner_username)
        except OwnerResolutionError as exc:
            raise CommandError(str(exc))

        sesion = create_capture_session(
            interfaz=interfaz,
            modo="activa",
            origen="manual",
            owner=owner,
        )
        sesion.estado = "capturando"
        sesion.inicio = timezone.now()
        sesion.save(update_fields=["estado", "inicio"])

        self.stdout.write(
            self.style.NOTICE(
                f"Iniciando captura activa #{sesion.id} contra {objetivo} ({tipo}) puertos={puertos}"
            )
        )

        resultados = []
        for puerto in puertos:
            accion = run_active_probe(
                sesion,
                tipo=tipo,
                objetivo=objetivo,
                puerto=puerto,
                payload=payload,
                timeout=timeout,
            )
            resultados.append(accion)
            estado = accion.resultado.get("estado")
            latencia = accion.resultado.get("latencia_ms")
            self.stdout.write(
                f"Puerto {puerto}/{accion.resultado.get('protocolo')} -> {estado} ({latencia} ms)"
            )

        mark_session_state(sesion, estado="completada", fin=timezone.now())
        self.stdout.write(self.style.SUCCESS(f"Acciones registradas: {len(resultados)}"))

    def _parse_ports(self, texto: str) -> List[int]:
        try:
            ports = [int(p.strip()) for p in texto.split(",") if p.strip()]
        except ValueError:
            raise ValueError("Puertos debe contener enteros separados por coma.")
        if not ports:
            ports = [80]
        return ports
