from django.db import models
from django.utils import timezone

class AgenteLocal(models.Model):
    interfaz = models.CharField(max_length=64)
    ip_local = models.GenericIPAddressField()
    cidr = models.PositiveSmallIntegerField()
    mac = models.CharField(max_length=32, unique=True)
    hostname = models.CharField(max_length=255)
    ultima_actualizacion = models.DateTimeField(default=timezone.now)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "agente_local"
        verbose_name = "Agente local"
        verbose_name_plural = "Agentes locales"

    def __str__(self):
        return f"{self.hostname} ({self.ip_local})"
