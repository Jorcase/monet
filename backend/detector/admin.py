from django.contrib import admin
from .models import AnalisisRed,HostDetectado,Dispositivo,DispositivoHistorial

@admin.register(AnalisisRed)
class AnalisisRedAdmin(admin.ModelAdmin):
    list_display = ("id", "interfaz", "tipo", "inicio", "fin", "total_hosts_detectados","duracion_ms")
    list_filter = ("tipo", "interfaz")
    search_fields = ("interfaz", "notas")


@admin.register(HostDetectado)
class HostDetectadoAdmin(admin.ModelAdmin):
    list_display = ("ip", "metodo_deteccion", "analisis", "mac", "latencia_ms", "ultima_vista")
    list_filter = ("metodo_deteccion", "analisis__interfaz")
    search_fields = ("ip", "mac", "hostname")


@admin.register(Dispositivo)
class DispositivoAdmin(admin.ModelAdmin):
    list_display = ("mac", "ip", "hostname","mac_aleatoria", "estado", "ultima_vez","metodo_identificacion")
    list_filter = ("estado", "mac_aleatoria", "metodo_identificacion")
    search_fields = ("mac", "ip", "hostname")


@admin.register(DispositivoHistorial)
class DispositivoHistorialAdmin(admin.ModelAdmin):
    list_display = ("dispositivo", "ip", "mac", "inicio", "fin", "motivo")
    list_filter = ("motivo",)
    search_fields = ("dispositivo__mac", "ip", "mac")

