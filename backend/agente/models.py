from django.db import models
from django.utils import timezone

class AgenteLocal(models.Model):
    interfaz = models.CharField(max_length=64)
    ip_local = models.GenericIPAddressField()
    cidr = models.PositiveSmallIntegerField()
    mac = models.CharField(max_length=32)
    hostname = models.CharField(max_length=255)
    ultima_actualizacion = models.DateTimeField(default=timezone.now)
    ubicacion = models.CharField(max_length=255, blank=True)
    ubicacion_slug = models.CharField(max_length=255, blank=True, editable=False)

    class Meta:
        db_table = "agente_local"
        verbose_name = "Agente local"
        verbose_name_plural = "Agentes locales"
        constraints = [
            models.UniqueConstraint(
                fields=["mac", "ubicacion_slug"], name="agente_mac_ubicacion_unique"
            )
        ]

    def save(self, *args, **kwargs):
        self.ubicacion_slug = (self.ubicacion or "").strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.hostname} ({self.ip_local})"
