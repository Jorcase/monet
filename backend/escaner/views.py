from __future__ import annotations

from typing import Iterable

from django.contrib import messages
from django.shortcuts import redirect, render
from django.utils import timezone

from detector.models import AnalisisRed, Dispositivo, HostDetectado
from escaner.models import TrabajoScanner
from escaner.services.scanner import ejecutar_trabajo


def _build_manual_targets(cadena: str) -> list[str]:
    """Normaliza la entrada manual de IPs."""
    if not cadena:
        return []
    separadores = [",", ";", "\n"]
    for sep in separadores:
        cadena = cadena.replace(sep, " ")
    return [ip.strip() for ip in cadena.split() if ip.strip()]


def _build_targets(
    dispositivos_ids: Iterable[str],
    manual_ips: str,
    incluir_local: bool,
    incluir_todos: bool,
    analisis_id: str | None,
) -> list[str]:
    targets: list[str] = []

    if incluir_local:
        targets.append("127.0.0.1")

    dispositivos_qs = Dispositivo.objects.none()

    if incluir_todos:
        dispositivos_qs = Dispositivo.objects.filter(estado="activo")
    elif dispositivos_ids:
        dispositivos_qs = Dispositivo.objects.filter(id__in=dispositivos_ids)

    if dispositivos_qs.exists():
        activos = dispositivos_qs.values_list("ip", flat=True)
        targets.extend([ip for ip in activos if ip])

    if analisis_id:
        hosts_ips = HostDetectado.objects.filter(analisis_id=analisis_id).values_list("ip", flat=True)
        targets.extend([ip for ip in hosts_ips if ip])

    targets.extend(_build_manual_targets(manual_ips))

    # quitamos duplicados conservando orden
    vistos = dict.fromkeys(ip for ip in targets if ip)
    return list(vistos.keys())


def scanner_dashboard(request):
    dispositivos_activos = Dispositivo.objects.filter(estado="activo").order_by("hostname", "ip")
    trabajos = (
        TrabajoScanner.objects.select_related("analisis")
        .prefetch_related("puertos__dispositivo", "puertos__host_detectado")
        .order_by("-inicio")[:20]
    )
    analisis_recientes = AnalisisRed.objects.order_by("-inicio")[:10]

    if request.method == "POST":
        tipo_scan = request.POST.get("tipo_scan", "rapido")
        incluir_local = bool(request.POST.get("scan_local"))
        incluir_todos = bool(request.POST.get("scan_all"))
        dispositivos_ids = request.POST.getlist("dispositivos")
        analisis_id = request.POST.get("analisis_id") or None
        ips_manual = request.POST.get("ips_manual", "")

        targets = _build_targets(
            dispositivos_ids,
            ips_manual,
            incluir_local,
            incluir_todos,
            analisis_id,
        )

        if not targets:
            messages.error(request, "Debés seleccionar al menos un objetivo o ingresar una IP.")
            return redirect("scanner_dashboard")

        analisis = AnalisisRed.objects.create(
            inicio=timezone.now(),
            interfaz="desconocida",
            tipo="escaner-activo",
            notas="Escaneo iniciado desde el panel web.",
        )

        trabajo = TrabajoScanner.objects.create(
            analisis=analisis,
            objetivo=", ".join(targets),
            tipo_scan=tipo_scan,
            estado="pendiente",
        )

        try:
            ejecutar_trabajo(trabajo, targets, tipo_scan=tipo_scan)
            messages.success(
                request,
                f"Escaneo {trabajo.id} completado. Puertos abiertos: {trabajo.puertos.count()}",
            )
        except Exception as exc:  # pylint: disable=broad-except
            messages.error(request, f"El escaneo falló: {exc}")

        return redirect("scanner_dashboard")

    contexto = {
        "trabajos": trabajos,
        "dispositivos_activos": dispositivos_activos,
        "tipos_scan": TrabajoScanner.TIPO_CHOICES,
        "analisis_recientes": analisis_recientes,
    }
    return render(request, "escaner/dashboard.html", contexto)
