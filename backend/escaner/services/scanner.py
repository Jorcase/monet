from __future__ import annotations

from typing import Iterable
from django.utils import timezone

from escaner.models import TrabajoScanner
from escaner.services.port_scan import run_port_scan
from escaner.services.persistence import guardar_resultados
# Orquestador del modulo
def ejecutar_trabajo(
        trabajo: TrabajoScanner,
        targets: Iterable[str],
        *,
        tipo_scan: str,
        puertos: str | None = None,  # puertos permite pasar la lista normalizada para escaneos personalizados
) -> TrabajoScanner:
    trabajo.estado = "ejecutando"
    trabajo.inicio = timezone.now()
    trabajo.save(update_fields=["estado","inicio"])

    try:
        resultados, resumen = run_port_scan(targets, tipo=tipo_scan, puertos=puertos)
        guardar_resultados(trabajo,resultados,resumen)
    except Exception as exc:
        trabajo.estado = "error"
        trabajo.fin = timezone.now()
        trabajo.notas = f"Error: {exc}"
        trabajo.save(update_fields=["estado", "fin", "notas"])
        raise
    else:
        return trabajo
    
