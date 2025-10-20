from django.contrib import admin
from .models import AgenteLocal

@admin.register(AgenteLocal)
class AgenteLocalAdmin(admin.ModelAdmin):
    list_display = ("hostname", "interfaz", "ip_local", "ultima_actualizacion")
    search_fields = ("hostname", "ip_local", "mac")
