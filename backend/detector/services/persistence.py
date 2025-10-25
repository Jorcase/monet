from django.utils import timezone

from detector.models import AnalisisRed, HostDetectado, Dispositivo, DispositivoHistorial

def persist_scan_results(analisis: AnalisisRed, hosts: list[dict]) -> dict:
    resumen = {"nuevos":0,"actualizados":0}
    ahora = timezone.now()

    for host in hosts:
        ip = host["ip"]
        mac = host.get("mac","")
        metodo = host.get("metodo","arp")
        latencia = host.get("latencia_ms")
        hostname = host.get("hostname","")
        
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
        
        if mac:
            dispositivo = Dispositivo.objects.filter(mac=mac).first()

            if dispositivo:
                old_ip = dispositivo.ip
                old_hostname = dispositivo.hostname
                old_ultima_vez = dispositivo.ultima_vez

                campos = ["ultima_vez"]
                dispositivo.ultima_vez = ahora

                if hostname:
                    if hostname != old_hostname:
                        dispositivo.hostname = hostname
                        campos.append("hostname")
                elif not old_hostname and hostname == "":
                    # mantenemos hostnames vacíos si no tenemos dato nuevo
                    pass

                if ip and old_ip != ip:
                    DispositivoHistorial.objects.create(
                        dispositivo=dispositivo,
                        ip=old_ip,
                        mac=dispositivo.mac,
                        inicio=old_ultima_vez or dispositivo.primera_vez,
                        fin=ahora,
                        motivo="dhcp",
                    )
                    dispositivo.ip = ip
                    campos.append("ip")

                dispositivo.save(update_fields=campos)

            else:
                Dispositivo.objects.create(
                    ip=ip,
                    mac=mac,
                    hostname=hostname,
                    primera_vez=ahora,
                    ultima_vez=ahora,
                )

    return resumen
