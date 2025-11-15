from __future__ import annotations

from django.utils import timezone

from config.ownership import OwnerResolutionError, resolve_owner
from detector.models import AnalisisRed
from detector.services.network_range import get_local_network, build_local_host_entry
from detector.services.arp_scan import perform_arp_scan
from detector.services.persistence import persist_scan_results


class DetectorRunError(RuntimeError):
    """Se lanza cuando no se puede ejecutar el escaneo de hosts."""


def run_detector_scan(
    *,
    interface: str | None = None,
    owner_username: str | None = None,
    scan_type: str | None = None,
    fingerprint_os: bool = False,
    arp_attempts: int | None = None,
    arp_rest: float | None = None,
) -> AnalisisRed:
    """
    Ejecuta el mismo flujo que el management command `detectar_hosts`.
    Retorna la instancia de AnalisisRed creada.
    """
    try:
        snapshot = get_local_network()
    except RuntimeError as exc:
        raise DetectorRunError(str(exc)) from exc

    interfaz = interface or snapshot.interfaz

    try:
        owner = resolve_owner(owner_username)
    except OwnerResolutionError as exc:
        raise DetectorRunError(str(exc)) from exc

    analisis = AnalisisRed.objects.create(
        inicio=timezone.now(),
        interfaz=interfaz,
        tipo=scan_type or "escaner-activo",
        notas="Detección de hosts por ARP",
        owner=owner,
    )

    try:
        hosts, duracion_total_ms = perform_arp_scan(
            snapshot.network,
            interfaz,
            local_ip=snapshot.ip_local,
            attempts=arp_attempts,
            rest=arp_rest or 0.0,
        )
        local_host = build_local_host_entry(snapshot)
        if local_host and not any(h["ip"] == local_host["ip"] for h in hosts):
            hosts.append(local_host)
    except RuntimeError as exc:
        analisis.delete()
        raise DetectorRunError(str(exc)) from exc

    resumen = persist_scan_results(analisis, hosts, owner=owner)
    analisis.total_hosts_detectados = resumen["nuevos"] + resumen["actualizados"]
    analisis.fin = timezone.now()
    analisis.duracion_ms = int(duracion_total_ms)
    analisis.save(update_fields=["total_hosts_detectados", "fin", "duracion_ms"])

    if fingerprint_os:
        from detector.services.os_fingerprint import fingerprint_hosts_with_nmap

        fingerprint_hosts_with_nmap(hosts, owner=owner)

    return analisis
