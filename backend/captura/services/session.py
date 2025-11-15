from __future__ import annotations

from typing import Optional

from django.utils import timezone

from captura.models import CapturaArchivo, CapturaEstadistica, CapturaSesion


def create_capture_session(
    interfaz: str,
    *,
    modo: str = "pasiva",
    origen: str = "manual",
    filtro_bpf: str = "",
    duracion_objetivo: Optional[int] = None,
    owner=None,
) -> CapturaSesion:
    """Crea una sesión con valores iniciales."""
    return CapturaSesion.objects.create(
        owner=owner,
        interfaz=interfaz,
        modo=modo,
        origen=origen,
        filtro_bpf=filtro_bpf,
        duracion_objetivo=duracion_objetivo,
        estado="pendiente",
    )


def mark_session_state(
    sesion: CapturaSesion,
    *,
    estado: str,
    observaciones: str | None = None,
    fin: Optional[timezone.datetime] = None,
) -> None:
    sesion.estado = estado
    if observaciones:
        sesion.observaciones = (sesion.observaciones + "\n" if sesion.observaciones else "") + observaciones
    if fin:
        sesion.fin = fin
    sesion.save(update_fields=["estado", "observaciones", "fin"])

    if estado == "completada":
        from analitica.services import evaluar_reglas_para_captura

        evaluar_reglas_para_captura(sesion)


def register_capture_file(
    sesion: CapturaSesion,
    *,
    ruta: str,
    tipo: str = "pcap",
    tamano_bytes: Optional[int] = None,
    hash_archivo: str = "",
    protegido: bool = False,
    expira_en: Optional[timezone.datetime] = None,
) -> CapturaArchivo:
    return CapturaArchivo.objects.create(
        sesion=sesion,
        tipo=tipo,
        ruta=ruta,
        tamano_bytes=tamano_bytes or 0,
        hash_archivo=hash_archivo,
        protegido=protegido,
        expira_en=expira_en,
    )


def increment_session_counters(
    sesion: CapturaSesion,
    *,
    paquetes: int = 0,
    bytes_totales: int = 0,
    descartados: int = 0,
) -> None:
    sesion.total_paquetes += paquetes
    sesion.total_bytes += bytes_totales
    sesion.paquetes_descartados += descartados
    sesion.save(update_fields=["total_paquetes", "total_bytes", "paquetes_descartados"])


def recompute_statistics(sesion: CapturaSesion) -> CapturaEstadistica:
    """Genera o actualiza la estadística global usando los flujos almacenados."""
    from captura.models import CapturaFlujo  # import tardío para evitar ciclos

    flujos = CapturaFlujo.objects.filter(sesion=sesion)
    hosts = set()
    puertos = set()
    protocolos = {}
    total_bytes = 0
    ventana_total = 0.0

    for flujo in flujos:
        hosts.add(flujo.src_ip)
        hosts.add(flujo.dst_ip)
        if flujo.src_port:
            puertos.add((flujo.src_port, flujo.protocolo))
        if flujo.dst_port:
            puertos.add((flujo.dst_port, flujo.protocolo))
        protocolos[flujo.protocolo] = protocolos.get(flujo.protocolo, 0) + flujo.bytes
        total_bytes += flujo.bytes
        ventana_total += (flujo.ventana_fin - flujo.ventana_inicio).total_seconds()

    if ventana_total == 0:
        ancho_promedio = None
        ancho_pico = None
    else:
        ancho_promedio = (total_bytes * 8 / ventana_total) / 1_000_000
        if protocolos:
            ancho_pico = max(protocolos.values()) * 8 / (sesion.duracion_objetivo or ventana_total or 1)
        else:
            ancho_pico = None
        # ancho_pico se aproxima usando el protocolo con más bytes en la ventana.

    top_protocolos = sorted(protocolos.items(), key=lambda item: item[1], reverse=True)[:5]
    payload = {proto: bytes_tot for proto, bytes_tot in top_protocolos}

    estadistica, _ = CapturaEstadistica.objects.update_or_create(
        sesion=sesion,
        defaults={
            "hosts_unicos": len(hosts),
            "puertos_unicos": len(puertos),
            "protocolos_top": payload,
            "ancho_banda_promedio": ancho_promedio,
            "ancho_banda_pico": ancho_pico,
            "alertas_generadas": 0,
        },
    )
    return estadistica
