from django.contrib import admin

from analitica.models import HeuristicaRegla, HeuristicaEvento


@admin.register(HeuristicaRegla)
class HeuristicaReglaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "modulo_objetivo", "tipo", "severidad_por_defecto", "activa")
    list_filter = ("modulo_objetivo", "tipo", "activa")
    search_fields = ("nombre", "descripcion")


@admin.register(HeuristicaEvento)
class HeuristicaEventoAdmin(admin.ModelAdmin):
    list_display = ("ts", "regla", "severidad", "dispositivo", "captura_sesion")
    list_filter = ("severidad", "regla__modulo_objetivo")
    search_fields = ("descripcion",)
