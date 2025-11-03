from __future__ import annotations

from typing import Iterable, Sequence
from datetime import timedelta

from django.contrib import messages
from django.shortcuts import redirect, render
from django.utils import timezone

from django.db.models import Q

from detector.models import AnalisisRed, Dispositivo, HostDetectado
from escaner.models import TrabajoScanner
from escaner.services.scanner import ejecutar_trabajo
from escaner.services.port_scan import normalize_port_list


def _build_manual_targets(cadena: str) -> list[str]:
    """Normaliza la entrada manual de IPs."""
    if not cadena:
        return []
    separadores = [",", ";", "\n"]
    for sep in separadores:
        cadena = cadena.replace(sep, " ")
    return [ip.strip() for ip in cadena.split() if ip.strip()]


def _build_targets(
    modo: str,
    manual_ips: str,
    incluir_local: bool,
    dispositivos_ids: Sequence[str],
    analisis_id: str | None,
    umbral_actividad,
) -> tuple[list[str], str | None]:
    modo = (modo or "").strip()
    ip_list: list[str] = []
    error: str | None = None

    if modo == "manual":
        if manual_ips:
            ip_list.extend(_build_manual_targets(manual_ips))
        if incluir_local:
            ip_list.append("127.0.0.1")
        if not ip_list:
            error = "Ingresá una IP o marcá la opción de host local."

    elif modo == "dispositivos":
        if not dispositivos_ids:
            return [], "Seleccioná al menos un dispositivo activo."
        dispositivos = (
            Dispositivo.objects.filter(
                id__in=dispositivos_ids,
                estado="activo",
                ultima_vez__gte=umbral_actividad,
            ).values_list("ip", flat=True)
        )
        ip_list.extend(ip for ip in dispositivos if ip)
        if not ip_list:
            error = "Los dispositivos elegidos no tienen IP disponible."

    elif modo == "analisis":
        if not analisis_id:
            return [], "Elegí un análisis reciente."
        hosts = HostDetectado.objects.filter(analisis_id=analisis_id).values_list("ip", flat=True)
        ip_list.extend(ip for ip in hosts if ip)
        if not ip_list:
            error = "El análisis seleccionado no contiene hosts con IP."

    else:
        error = "Seleccioná uno de los modos disponibles."

    dedupe = list(dict.fromkeys(ip_list))
    if not dedupe and error is None:
        error = "No se encontraron IPs válidas para el modo elegido."

    return dedupe, error


def scanner_dashboard(request):
    umbral_actividad = timezone.now() - timedelta(minutes=30)

    dispositivos_activos_qs = (
        Dispositivo.objects.filter(estado="activo", ultima_vez__gte=umbral_actividad)
        .order_by("hostname", "ip")
    )
    trabajos = (
        TrabajoScanner.objects.select_related("analisis")
        .prefetch_related("puertos__dispositivo", "puertos__host_detectado")
        .order_by("-inicio")[:20]
    )
    analisis_recientes = AnalisisRed.objects.filter(
        Q(fin__gte=umbral_actividad) | Q(fin__isnull=True, inicio__gte=umbral_actividad)
    ).order_by("-inicio")[:10]

    modo_actual = "manual"
    ips_manual_valor = ""
    scan_local_checked = False
    analisis_seleccionado = None
    dispositivos_seleccionados: list[str] = []
    tipo_scan = "rapido"
    puertos_personalizados = ""

    if request.method == "POST":
        modo_actual = request.POST.get("modo_objetivo", "manual")
        ips_manual_valor = request.POST.get("ips_manual", "")
        scan_local_checked = bool(request.POST.get("scan_local"))
        analisis_seleccionado = request.POST.get("analisis_id") or None
        dispositivos_seleccionados = request.POST.getlist("dispositivos")
        tipo_scan = request.POST.get("tipo_scan", "rapido")
        puertos_personalizados = request.POST.get("puertos_personalizados", "").strip()
        puertos_normalizados: str | None = None

        if tipo_scan == "personalizado":
            try:
                puertos_normalizados = normalize_port_list(puertos_personalizados)
            except ValueError as exc:
                messages.error(request, str(exc))
                return redirect("scanner_dashboard")

        targets, mensaje_error = _build_targets(
            modo_actual,
            ips_manual_valor,
            scan_local_checked,
            dispositivos_seleccionados,
            analisis_seleccionado,
            umbral_actividad,
        )

        if mensaje_error:
            messages.error(request, mensaje_error)
        elif not targets:
            messages.error(request, "No se generaron objetivos para escanear.")
        else:
            analisis_obj = None
            if analisis_seleccionado:
                analisis_obj = AnalisisRed.objects.filter(pk=analisis_seleccionado).first()
                if not analisis_obj:
                    messages.error(request, "El análisis seleccionado ya no existe.")
                    return redirect("scanner_dashboard")
            trabajo = TrabajoScanner.objects.create(
                analisis=analisis_obj,
                objetivo=", ".join(targets),
                tipo_scan=tipo_scan,
                estado="pendiente",
            )
            if puertos_normalizados:
                trabajo.notas = f"Puertos personalizados: {puertos_normalizados}"
                trabajo.save(update_fields=["notas"])
            try:
                ejecutar_trabajo(trabajo, targets, tipo_scan=tipo_scan, puertos=puertos_normalizados)
                messages.success(
                    request,
                    f"Escaneo {trabajo.id} completado. Puertos abiertos: {trabajo.puertos.count()}",
                )
                return redirect("scanner_dashboard")
            except Exception as exc:  # pylint: disable=broad-except
                messages.error(request, f"El escaneo falló: {exc}")

    contexto = {
        "trabajos": trabajos,
        "dispositivos_activos": dispositivos_activos_qs,
        "tipos_scan": TrabajoScanner.TIPO_CHOICES,
        "analisis_recientes": analisis_recientes,
        "modo_actual": modo_actual,
        "umbral_minutos": 30,
        "ips_manual_valor": ips_manual_valor,
        "scan_local_checked": scan_local_checked,
        "analisis_seleccionado": analisis_seleccionado,
        "dispositivos_seleccionados": dispositivos_seleccionados,
        "tipo_scan_seleccionado": tipo_scan,
        "puertos_personalizados": puertos_personalizados,
    }
    return render(request, "escaner/dashboard.html", contexto)
