from django.shortcuts import render, redirect
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from .models import AgenteLocal
from .services.network_info import collect_network_snapshot

@require_http_methods(["GET", "POST"])
def agente_status(request):
    agente = AgenteLocal.objects.order_by("-ultima_actualizacion").first()
    if agente and agente.ultima_actualizacion:
        agente.ultima_actualizacion_local = (
            timezone.localtime(agente.ultima_actualizacion)
            if timezone.is_aware(agente.ultima_actualizacion)
            else agente.ultima_actualizacion
        )

    if request.method == "POST":
        try:
            snapshot = collect_network_snapshot(interface_preferida=request.POST.get("interface") or None)
            obj, creado = AgenteLocal.objects.update_or_create(
                mac=snapshot["mac"],
                defaults={
                    **snapshot,
                    "ultima_actualizacion": timezone.now(),
                },  
            )
            request.session["agente_mensaje"] = "Registro creado" if creado else "Registro actualizado"
        except RuntimeError as exc:
            request.session["agente_error"] = str(exc)
        return redirect("agente_status")

    contexto = {
        "agente": agente,
        "mensaje": None,
        "error": None,
    }
    if mensaje := request.session.pop("agente_mensaje", None):
        contexto["mensaje"] = mensaje
    if error := request.session.pop("agente_error", None):
        contexto["error"] = error

    return render(request, "agente/status.html", contexto)
