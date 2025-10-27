from django.contrib import messages
from django.shortcuts import render, redirect
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from detector.models import AnalisisRed, Dispositivo
from detector.services.network_range import get_local_network
from detector.services.arp_scan import perform_arp_scan
from detector.services.persistence  import persist_scan_results

@require_http_methods(["GET", "POST"])
def detector_status(request):
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

            hosts, duracion_total_ms = perform_arp_scan(snapshot.network, interfaz, local_ip=snapshot.ip_local)
            resumen = persist_scan_results(analisis, hosts)

            analisis.total_hosts_detectados = resumen["nuevos"] + resumen["actualizados"]
            analisis.fin = timezone.now()
            analisis.duracion_ms = int(duracion_total_ms)
            analisis.save(update_fields=["total_hosts_detectados", "fin", "duracion_ms"])

            messages.success(
                request,
                f"Detección completada en {interfaz}. Nuevos: {resumen['nuevos']}, actualizados: {resumen['actualizados']}. Duración: {int(duracion_total_ms)} ms."
            )
        except RuntimeError as exc:
            messages.error(request, str(exc))

        return redirect("detector_status")

    analisis_qs = AnalisisRed.objects.order_by("-inicio").prefetch_related("hosts_detectados")
    analisis_list = []
    for analisis in analisis_qs:
        hosts_cache = []
        for host in analisis.hosts_detectados.order_by("-ultima_vista"):
            dispositivo = None
            if host.mac:
                dispositivo = Dispositivo.objects.filter(mac=host.mac).first()
            if not dispositivo and host.hostname:
                dispositivo = Dispositivo.objects.filter(mac_aleatoria=True, hostname=host.hostname).first()
            if not dispositivo:
                dispositivo = (
                    Dispositivo.objects.filter(mac_aleatoria=True, ip=host.ip)
                    .order_by("-ultima_vez")
                    .first()
                )

            host.mac_aleatoria_flag = dispositivo.mac_aleatoria if dispositivo else None
            host.es_temporal_flag = dispositivo.es_temporal if dispositivo else None
            host.estado_flag = dispositivo.estado if dispositivo else None
            host.hostname_persistido = dispositivo.hostname if dispositivo else ""
            host.vendor_flag = dispositivo.vendor if dispositivo else ""
            hosts_cache.append(host)
        analisis.hosts_cache = hosts_cache
        analisis_list.append(analisis)

    analisis_seleccionado = None
    seleccionado_id = request.GET.get("analisis_id")

    if seleccionado_id:
        for analisis in analisis_list:
            if str(analisis.pk) == seleccionado_id:
                analisis_seleccionado = analisis
                break
        else:
            messages.warning(request, "El análisis seleccionado no existe.")

    if not analisis_seleccionado:
        analisis_seleccionado = analisis_list[0] if analisis_list else None

    hosts = analisis_seleccionado.hosts_cache if analisis_seleccionado else []

    contexto = {
        "analisis": analisis_seleccionado,
        "hosts": hosts,
        "historial": analisis_list,
        "analisis_seleccionado_id": analisis_seleccionado.pk if analisis_seleccionado else None,
    }
    return render(request, "detector/status.html", contexto)
