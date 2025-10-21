from django.contrib import messages
from django.shortcuts import render, redirect
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from detector.models import AnalisisRed
from detector.services.network_range import get_local_network
from detector.services.arp_scan import perform_arp_scan
from detector.services.persistence  import persist_scan_results

@require_http_methods(["GET", "POST"])
def detector_status(request):
    ultimo_analisis = AnalisisRed.objects.order_by("-inicio").prefetch_related("hosts_detectados").first()

    if request.method == "POST":
        try:
            snapshot = get_local_network()
            interfaz = request.POST.get("interface") or snapshot.interfaz

            analisis =  AnalisisRed.objects.create(
                inicio=timezone.now(),
                interfaz = interfaz,
                tipo="escaner-activo",
                notas="Deteccion de hosts desde la vista web",
            )

            hosts = perform_arp_scan(snapshot.network, interfaz, local_ip=snapshot.ip_local)
            resumen = persist_scan_results(analisis, hosts)

            analisis.total_hosts_detectados = resumen["nuevos"] + resumen["actualizados"]
            analisis.fin = timezone.now()
            analisis.save(update_fields=["total_hosts_detectados", "fin"])

            messages.success(
                request,
                f"Detección completada en {interfaz}. Nuevos: {resumen['nuevos']}, actualizados: {resumen['actualizados']}."
            )
        except RuntimeError as exc:
            messages.error(request, str(exc))

        return redirect("detector_status")

    contexto = {
        "analisis": ultimo_analisis,
        "hosts": ultimo_analisis.hosts_detectados.order_by("-ultima_vista") if ultimo_analisis else [],
    }
    return render(request, "detector/status.html", contexto)