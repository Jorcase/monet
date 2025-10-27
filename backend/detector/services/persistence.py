from django.utils import timezone

from detector.models import AnalisisRed, HostDetectado, Dispositivo, DispositivoHistorial

from datetime import timedelta

from detector.services.vendor import resolve_vendor


def persist_scan_results(analisis: AnalisisRed, hosts: list[dict]) -> dict:
    resumen = {"nuevos":0,"actualizados":0}
    ahora = timezone.now()

    for host in hosts:
        ip = host["ip"]
        mac = host.get("mac","")
        metodo = host.get("metodo","arp")
        hostname = host.get("hostname", "")
        mac_random = host.get("mac_aleatoria", False)
        latencia = host.get("latencia_ms")
        
        host_obj, creado =  HostDetectado.objects.update_or_create(
            analisis=analisis,
            ip=ip,
            defaults={
                "mac":mac,
                "metodo_deteccion": metodo,
                "latencia_ms": latencia,
                "hostname": hostname,
                "ultima_vista": ahora,
            }
        )
        if creado:
            host_obj.primera_vista = ahora
            host_obj.save(update_fields=["primera_vista"])
            resumen["nuevos"] += 1
        else:
            resumen["actualizados"] += 1
        
        if not mac:
            continue  

        dispositivo = None

        if mac_random:

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
        else:
            dispositivo = Dispositivo.objects.filter(mac=mac).first()

        if dispositivo:
            anterior_ultima_vez = dispositivo.ultima_vez
            dispositivo.ultima_vez = ahora

            if hostname and hostname != dispositivo.hostname:
                dispositivo.hostname = hostname

            if mac_random:
                dispositivo.mac_aleatoria = True
                dispositivo.es_temporal = True
                dispositivo.metodo_identificacion = "hostname" if hostname else "ip"
                dispositivo.mac = mac  # guardamos la última MAC reportada
            else:
                dispositivo.mac = mac
                if not dispositivo.vendor:
                    dispositivo.vendor = resolve_vendor(mac)

                dispositivo.mac_aleatoria = False
                dispositivo.es_temporal = False
                dispositivo.metodo_identificacion = "mac"

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

            dispositivo.estado = "activo"
            dispositivo.ultima_vez = ahora

            dispositivo.save()
        else:
            vendor = resolve_vendor(mac if not mac_random else "")
            metodo = "hostname" if hostname else ("mac" if not mac_random else "ip")
            Dispositivo.objects.create(
                ip=ip,
                mac=mac,
                hostname=hostname,
                mac_aleatoria=mac_random,
                es_temporal=mac_random,
                vendor=vendor, 
                primera_vez=ahora,
                ultima_vez=ahora,
                metodo_identificacion=metodo,
                estado="activo",
            )


    return resumen


INACTIVO_UMBRAL = timedelta(hours=1)

def marcar_dispositivos_inactivos():
    limite = timezone.now() - INACTIVO_UMBRAL
    Dispositivo.objects.filter(ultima_vez__lt=limite, estado="activo").update(estado="inactivo")
