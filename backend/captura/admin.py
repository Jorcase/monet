from django.contrib import admin

from captura.models import (
    CapturaSesion,
    CapturaArchivo,
    CapturaFlujo,
    CapturaEstadistica,
    FingerprintObservacion,
)


@admin.register(CapturaSesion)
class CapturaSesionAdmin(admin.ModelAdmin):
    list_display = ("id", "interfaz", "estado", "inicio", "fin", "total_paquetes")
    list_filter = ("estado",)
    search_fields = ("interfaz", "notas")


@admin.register(CapturaArchivo)
class CapturaArchivoAdmin(admin.ModelAdmin):
    list_display = ("id", "sesion", "tipo", "ruta", "tamano_bytes", "creado")
    search_fields = ("ruta",)


@admin.register(CapturaFlujo)
class CapturaFlujoAdmin(admin.ModelAdmin):
    list_display = ("id", "sesion", "src_ip", "dst_ip", "protocolo", "paquetes", "bytes")
    list_filter = ("protocolo", "direccion")
    search_fields = ("src_ip", "dst_ip")


@admin.register(CapturaEstadistica)
class CapturaEstadisticaAdmin(admin.ModelAdmin):
    list_display = ("sesion", "hosts_unicos", "puertos_unicos", "ancho_banda_promedio", "alertas_generadas")



@admin.register(FingerprintObservacion)
class FingerprintObservacionAdmin(admin.ModelAdmin):
    list_display = ("id", "dispositivo", "metodo", "sistema_estimado", "probabilidad", "timestamp")
    list_filter = ("metodo",)
    search_fields = ("dispositivo__hostname", "dispositivo__ip")
