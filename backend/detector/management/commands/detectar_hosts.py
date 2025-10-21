from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from detector.models import AnalisisRed
from detector.services.network_range import get_local_network
from detector.services.arp_scan import perform_arp_scan
from detector.services.persistence import persist_scan_results

class Command(BaseCommand):
    help = "Detecta hosts en la red local usando ARP y guarda resultados"

    def add_arguments(self, parser):#util si permitimos varias interfaces en la vm
        parser.add_argument("--interface", help="Forzar el uso de una interfaz especifica")
    
    def handle(self, *args, **options):
        try:
            snapshot = get_local_network()
        except RuntimeError as exc:
            raise  CommandError(str(exc)) 
        interfaz = options.get("interface") or snapshot.interfaz

        analisis = AnalisisRed.objects.create(
            inicio=timezone.now(),
            interfaz=interfaz,
            tipo="escaner-activo",
            notas="Detección de hosts por ARP",
        )
        try:
            hosts = perform_arp_scan(
                snapshot.network,
                interfaz,
                local_ip=snapshot.ip_local,
            )
        except RuntimeError as exc:
            raise CommandError(str(exc))
        
        resumen = persist_scan_results(analisis, hosts)
        analisis.total_hosts_detectados = resumen["nuevos"] + resumen["actualizados"]
        analisis.fin = timezone.now()
        analisis.save(update_fields=["total_hosts_detectados", "fin"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Detección completada. Nuevos: {resumen['nuevos']}, actualizados: {resumen['actualizados']}."
            )
        )
        if not hosts:
            self.stdout.write(self.style.WARNING("No se detectaron hosts."))
