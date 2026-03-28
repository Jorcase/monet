from __future__ import annotations

import os
from threading import Event

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from config.ownership import OwnerResolutionError, resolve_owner
from captura.models import CapturaSesion
from captura.services import (
    create_capture_session,
    generar_fingerprints_para_sesion,
    actualizar_dispositivos_con_fingerprints,
    mark_session_state,
    recompute_statistics,
    run_passive_capture,
    validar_con_p0f,
)
from captura.services.session import register_capture_file
from captura.services.sniffer import CaptureUnavailable


class Command(BaseCommand):
    help = "Realiza una captura pasiva en la interfaz indicada y guarda los flujos en la BD."

    def add_arguments(self, parser):
        parser.add_argument(
            "--interfaz",
            required=True,
            help="Interfaz de red a utilizar (ej. eth0, enp0s3).",
        )
        parser.add_argument(
            "--duracion",
            type=int,
            default=60,
            help="Duración objetivo en segundos (default: 60).",
        )
        parser.add_argument(
            "--ventana",
            type=int,
            default=10,
            help="Tamaño de ventana (segundos) para agrupar flujos (default: 10).",
        )
        parser.add_argument(
            "--filtro",
            help="Filtro BPF opcional (ej. 'tcp port 80').",
        )
        parser.add_argument(
            "--pcap",
            help="Ruta opcional para guardar un archivo .pcap con la captura.",
        )
        parser.add_argument(
            "--sin-p0f",
            action="store_true",
            help="No ejecutar validación con p0f aunque haya PCAP disponible.",
        )
        parser.add_argument(
            "--owner",
            help="Nombre de usuario al que se asignará la captura (default: primer usuario).",
        )

    def handle(self, *args, **options):
        interfaz = options["interfaz"]
        duracion = options["duracion"]
        ventana = options["ventana"]
        filtro = options.get("filtro") or ""
        ruta_pcap = options.get("pcap")
        ejecutar_p0f = not options["sin_p0f"]

        owner_username = options.get("owner")
        try:
            owner = resolve_owner(owner_username)
        except OwnerResolutionError as exc:
            raise CommandError(str(exc))

        sesion = create_capture_session(
            interfaz=interfaz,
            modo="pasiva",
            origen="manual",
            filtro_bpf=filtro,
            duracion_objetivo=duracion,
            owner=owner,
        )
        self.stdout.write(self.style.NOTICE(f"Sesión #{sesion.id} creada. Iniciando captura en {interfaz}..."))

        stop_event = Event()
        try:
            run_passive_capture(
                sesion,
                ventana_segundos=ventana,
                duracion_segundos=duracion,
                filtro_bpf=filtro,
                interfaz=interfaz,
                stop_event=stop_event,
            )
        except CaptureUnavailable as exc:
            mark_session_state(sesion, estado="error", observaciones=str(exc), fin=timezone.now())
            raise CommandError(str(exc)) from exc
        except KeyboardInterrupt:
            stop_event.set()
            mark_session_state(sesion, estado="abortada", observaciones="Interrumpida por el usuario", fin=timezone.now())
            self.stdout.write(self.style.WARNING("Captura interrumpida."))
            return

        if ruta_pcap:
            register_capture_file(sesion, ruta=ruta_pcap, tipo="pcap")

        estadistica = recompute_statistics(sesion)
        self.stdout.write(
            self.style.SUCCESS(
                f"Captura completada. Paquetes={sesion.total_paquetes}, hosts únicos={estadistica.hosts_unicos}"
            )
        )

        fingerprints = generar_fingerprints_para_sesion(sesion)
        self.stdout.write(self.style.NOTICE(f"Fingerprints generados: {fingerprints}"))
        if fingerprints:
            from captura.models import FingerprintObservacion

            obs = FingerprintObservacion.objects.filter(sesion=sesion)
            actualizados = actualizar_dispositivos_con_fingerprints(obs)
            self.stdout.write(self.style.NOTICE(f"Dispositivos enriquecidos: {actualizados}"))

        if ruta_pcap and ejecutar_p0f:
            observaciones = validar_con_p0f(sesion)
            self.stdout.write(self.style.NOTICE(f"Observaciones p0f: {observaciones}"))
