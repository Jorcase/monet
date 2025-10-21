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
            dispositivo, dispositivo_creado = Dispositivo.objects.update_or_create(
                mac=mac,
                defaults={
                    "ip": ip,
                    "hostname": hostname,
                    "ultima_vez": ahora,
                },
            )
            if dispositivo_creado:
                dispositivo.primera_vez = ahora 
                dispositivo.save(update_fields=["primera_vez"])
            else:
                if dispositivo.ip != ip:
                    DispositivoHistorial.objects.create(
                        dispositivo=dispositivo,
                        ip=dispositivo.ip,
                        mac=dispositivo.mac,
                        inicio=dispositivo.primera_vez,
                        fin=ahora,
                        motivo="dhcp",
                    )
                    dispositivo.ip = ip 
                    dispositivo.save(update_fields=["ip","ultima_vez"])

    return resumen