from __future__ import annotations
from typing import Iterable
from django.core.management.base import BaseCommand, CommandError

from detector.models import AnalisisRed, Dispositivo
from escaner.models import TrabajoScanner
from escaner.services.scanner import ejecutar_trabajo
from escaner.services.port_scan import normalize_port_list

class Command(BaseCommand):
    help = "Ejecuta un escaneo de puertos usando nmap"
    
    def _obtener_targets(self,options) -> list[str]:#cambie el nombre de la funcion que tanto afecta?
        targets = []
        
        if options["local"]:
            targets.append("127.0.0.1")
        manuales = options.get("ip") or []
        targets.extend(manuales)
        if options["dispositivos_activos"]:
            activos = Dispositivo.objects.filter(estado="activo").values_list("ip", flat=True)
            targets.extend(activos)

        if options["analisis"]:
            analisis= AnalisisRed.objects.filter(id__in=options["analisis"]).prefetch_related("hosts_detectados")
            for a in analisis:
                targets.extend(a.hosts_detectados.values_list("ip", flat=True))
        
        targets = [ip for ip in targets if ip]
        if not targets:
            raise CommandError("No hay targets validos para el escaneo")
        return list(dict.fromkeys(targets))
    
    def add_arguments(self, parser):
        parser.add_argument("--local", action="store_true", help="Incluir el host local")
        parser.add_argument("--ip", nargs="+", help="Una o más IPs manuales")
        parser.add_argument("--dispositivos-activos", action="store_true", help="Escanear dispositivos activos")
        parser.add_argument("--analisis", nargs="+", type=int, help="IDs de analisis recientes para tomar hosts")
        parser.add_argument("--tipo", default="rapido", choices=["rapido", "tcp-1000", "tcp-completo", "personalizado"], help="Tipo de escaneo a ejecutar")
        parser.add_argument("--puertos", help="Lista de puertos a escanear cuando el tipo es personalizado (ej. 22,80,443 8000-8100)")
        parser.add_argument("--analisis-id", type=int, help="ID del AnalisisRed asociado (opcional)")

    def handle(self, *args, **options):
        targets = self._obtener_targets(options)
        tipo = options["tipo"]

        puertos = None
        if tipo == "personalizado":
            puertos_raw = options.get("puertos", "")
            if not puertos_raw:
                raise CommandError("Debés indicar --puertos cuando el tipo es personalizado.")
            try:
                puertos = normalize_port_list(puertos_raw)
            except ValueError as exc:
                raise CommandError(str(exc)) from exc

        analisis = None
        analisis_id = options.get("analisis_id")
        if analisis_id:
            try:
                analisis = AnalisisRed.objects.get(pk=analisis_id)
            except AnalisisRed.DoesNotExist:
                raise CommandError(f"AnalisisRed {analisis_id} no existe.")

        trabajo = TrabajoScanner.objects.create(
            analisis=analisis,
            objetivo=", ".join(targets),
            tipo_scan=tipo,
            estado="pendiente",
        )
        if puertos:
            trabajo.notas = f"Puertos personalizados: {puertos}"
            trabajo.save(update_fields=["notas"])

        self.stdout.write(self.style.NOTICE(f"Trabajo {trabajo.id} iniciado para {len(targets)} targets."))

        try:
            ejecutar_trabajo(trabajo, targets, tipo_scan=tipo, puertos=puertos)
        except Exception as exc: 
            raise CommandError(f"Fallo al ejecutar el escaneo: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(f"Trabajo {trabajo.id} completado."))
