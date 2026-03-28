from django.utils import timezone

from detector.models import AnalisisRed, HostDetectado, Dispositivo, DispositivoHistorial

from datetime import timedelta

from detector.services.vendor import resolve_vendor
from analitica.models import HeuristicaRegla, HeuristicaEvento
from analitica.services.engine import (
    construir_eventos_cambio_hostname,
    construir_eventos_cambio_ip,
    construir_eventos_mac_aleatoria,
    construir_eventos_mac_especifica,
    construir_eventos_nuevo_host,
)


def persist_scan_results(analisis: AnalisisRed, hosts: list[dict], owner=None) -> dict:
    resumen = {"nuevos":0,"actualizados":0}
    ahora = timezone.now()
    owner = owner or getattr(analisis, "owner", None)

    reglas_detector = list(
        HeuristicaRegla.objects.filter(
            modulo_objetivo__in=["detector", "global"],
            activa=True,
        )
    )
    reglas_nuevo = [r for r in reglas_detector if (r.parametros or {}).get("tipo") == "nuevo_host"]
    reglas_mac_random = [r for r in reglas_detector if (r.parametros or {}).get("tipo") == "mac_aleatoria"]
    reglas_mac_especifica = [r for r in reglas_detector if (r.parametros or {}).get("tipo") == "mac_especifica"]
    reglas_cambio_hostname = [r for r in reglas_detector if (r.parametros or {}).get("tipo") == "cambio_hostname"]
    reglas_cambio_ip = [r for r in reglas_detector if (r.parametros or {}).get("tipo") == "cambio_ip"]

    eventos: list[HeuristicaEvento] = []

    for host in hosts:
        ip = host["ip"]
        mac = host.get("mac", "")
        if mac:
            mac = mac.lower()
        metodo = host.get("metodo","arp")
        hostname = host.get("hostname", "")
        mac_random = host.get("mac_aleatoria", False)
        latencia = host.get("latencia_ms")
        primera = host.get("first_seen")
        ultima = host.get("last_seen") or ahora
        
        host_obj, creado = HostDetectado.objects.update_or_create(
            analisis=analisis,
            ip=ip,
            defaults={
                "mac": mac,
                "metodo_deteccion": metodo,
                "latencia_ms": latencia,
                "hostname": hostname,
                "ultima_vista": ultima,
                **({"primera_vista": primera} if primera else {}),
            },
        )
        if creado:
            host_obj.primera_vista = primera or ahora
            host_obj.save(update_fields=["primera_vista"])
            resumen["nuevos"] += 1
        else:
            if ultima and ultima > host_obj.ultima_vista:
                host_obj.ultima_vista = ultima
                host_obj.save(update_fields=["ultima_vista"])
            resumen["actualizados"] += 1
        
        if not mac:
            continue  

        dispositivo = Dispositivo.objects.filter(mac=mac).first() if mac else None
        dispositivo_creado = False

        if mac_random and not dispositivo:
            if hostname:
                dispositivo = Dispositivo.objects.filter(
                    mac_aleatoria=True,
                    hostname=hostname,
                ).first()

            if not dispositivo:
                dispositivo = (
                    Dispositivo.objects.filter(mac_aleatoria=True, ip=ip)
                    .order_by("-ultima_vez")
                    .first()
                )

        if dispositivo:
            anterior_ultima_vez = dispositivo.ultima_vez
            dispositivo.ultima_vez = ultima

            if owner and not dispositivo.owner_id:
                dispositivo.owner = owner

            prev_hostname = dispositivo.hostname
            prev_ip = dispositivo.ip

            if hostname and hostname != dispositivo.hostname:
                dispositivo.hostname = hostname

            if mac_random:
                dispositivo.mac_aleatoria = True
                dispositivo.mac = mac  # guardamos la última MAC reportada
            else:
                dispositivo.mac = mac
                if not dispositivo.vendor:
                    dispositivo.vendor = resolve_vendor(mac)

                dispositivo.mac_aleatoria = False

            if dispositivo.ip != ip:
                DispositivoHistorial.objects.create(
                  dispositivo=dispositivo,
                  ip=dispositivo.ip,
                  mac=dispositivo.mac,
                  inicio=anterior_ultima_vez or dispositivo.primera_vez,
                  fin=ahora,
                  motivo="dhcp",
                )
                dispositivo.ip = ip
                if reglas_cambio_ip:
                    eventos.extend(
                        construir_eventos_cambio_ip(
                            reglas_cambio_ip,
                            dispositivo,
                            prev_ip,
                            ip,
                            owner=_select_owner(owner, dispositivo.owner, analisis.owner),
                        )
                    )

            dispositivo.estado = "activo"
            dispositivo.ultima_vez = ultima

            dispositivo.save()

            if reglas_cambio_hostname and prev_hostname != dispositivo.hostname:
                eventos.extend(
                    construir_eventos_cambio_hostname(
                        reglas_cambio_hostname,
                        dispositivo,
                        prev_hostname,
                        dispositivo.hostname,
                        owner=_select_owner(owner, dispositivo.owner, analisis.owner),
                    )
                )
        else:
            vendor = resolve_vendor(mac if not mac_random else "")
            Dispositivo.objects.create(
                ip=ip,
                mac=mac,
                hostname=hostname,
                mac_aleatoria=mac_random,
                vendor=vendor, 
                primera_vez=primera or ahora,
                ultima_vez=ultima,
                estado="activo",
                owner=owner,
            )
            dispositivo_creado = True
            # Reasignar dispositivo para usar en eventos posteriores
            dispositivo = Dispositivo.objects.filter(mac=mac).first()

        if dispositivo_creado and reglas_nuevo:
            eventos.extend(
                construir_eventos_nuevo_host(
                    reglas_nuevo,
                    host_obj,
                    dispositivo,
                    owner=_select_owner(owner, dispositivo.owner if dispositivo else None, analisis.owner),
                )
            )

        if mac_random and reglas_mac_random:
            eventos.extend(
                construir_eventos_mac_aleatoria(
                    reglas_mac_random,
                    host_obj,
                    dispositivo,
                    owner=_select_owner(owner, dispositivo.owner if dispositivo else None, analisis.owner),
                )
            )
        if reglas_mac_especifica and mac:
            eventos.extend(
                construir_eventos_mac_especifica(
                    reglas_mac_especifica,
                    host_obj,
                    dispositivo,
                    owner=_select_owner(owner, dispositivo.owner if dispositivo else None, analisis.owner),
                )
            )

    if eventos:
        HeuristicaEvento.objects.bulk_create(eventos)

    return resumen


INACTIVO_UMBRAL = timedelta(hours=1)

def marcar_dispositivos_inactivos():
    limite = timezone.now() - INACTIVO_UMBRAL
    Dispositivo.objects.filter(ultima_vez__lt=limite, estado="activo").update(estado="inactivo")


def _select_owner(*owners):
    for owner in owners:
        if owner:
            return owner
    return None
