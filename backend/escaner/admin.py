from django.contrib import admin

from escaner.models import TrabajoScanner, PuertoEncontrado


class PuertoEncontradoInline(admin.TabularInline):
    model = PuertoEncontrado
    extra = 0
    readonly_fields = ("puerto", "protocolo", "servicio", "estado", "detected_at", "dispositivo", "host_detectado")
    can_delete = False


@admin.register(TrabajoScanner)
class TrabajoScannerAdmin(admin.ModelAdmin):
    list_display = ("id", "objetivo", "tipo_scan", "estado", "inicio", "fin")
    list_filter = ("tipo_scan", "estado")
    search_fields = ("objetivo", "notas")
    date_hierarchy = "inicio"
    inlines = [PuertoEncontradoInline]
    readonly_fields = ("analisis", "inicio", "fin", "notas")


@admin.register(PuertoEncontrado)
class PuertoEncontradoAdmin(admin.ModelAdmin):
    list_display = ("puerto", "protocolo", "estado", "host_ip","dispositivo", "host_detectado", "trabajo", "detected_at")
    list_filter = ("protocolo", "estado")
    search_fields = ("puerto", "servicio", "trabajo__objetivo", "dispositivo__ip", "host_detectado__ip")
    autocomplete_fields = ("trabajo", "dispositivo", "host_detectado", "analisis")
    readonly_fields = ("detected_at",)
