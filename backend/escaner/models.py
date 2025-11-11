from django.conf import settings
from django.db import models
from django.utils import timezone


class TrabajoScanner(models.Model):

    TIPO_CHOICES = [
        ("rapido", "Rápido (top ports)"),
        ("tcp-completo", "TCP completo"),
        ("tcp-1000", "TCP primeros 1000"),
        ("personalizado", "Personalizado"),
    ]

    ESTADO_CHOICES = [
        ("pendiente", "Pendiente"),
        ("ejecutando", "Ejecutando"),
        ("completado", "Completado"),
        ("error", "Error"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="trabajos_scanner",
    )
    analisis = models.ForeignKey("detector.AnalisisRed", on_delete=models.SET_NULL, null=True, blank=True, related_name="trabajos_scanner")
    objetivo = models.CharField(max_length=255)
    tipo_scan = models.CharField(max_length=32, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=16, choices=ESTADO_CHOICES, default="pendiente")
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "trabajo_scanner"
        verbose_name = "Trabajo de escaner"
        verbose_name_plural = "Trabajos de escaner"

    def __str__(self) -> str:
        return f"{self.objetivo} ({self.get_tipo_scan_display()})"


class PuertoEncontrado(models.Model):

    PROTO_CHOICES = [
        ("tcp", "TCP"),
        ("udp", "UDP"),
    ]

    ESTADO_CHOICES = [
        ("abierto", "Abierto"),
        ("filtrado", "Filtrado"),
        ("cerrado", "Cerrado"),
    ]

    trabajo = models.ForeignKey(TrabajoScanner, on_delete=models.CASCADE, related_name="puertos")
    analisis = models.ForeignKey("detector.AnalisisRed", on_delete=models.SET_NULL, null=True, blank=True, related_name="puertos")
    host_detectado = models.ForeignKey("detector.HostDetectado", on_delete=models.SET_NULL, null=True, blank=True, related_name="puertos")
    dispositivo = models.ForeignKey("detector.Dispositivo", on_delete=models.SET_NULL, null=True, blank=True, related_name="puertos")
    host_ip = models.GenericIPAddressField(null=True, blank=True)
    puerto = models.PositiveIntegerField()
    protocolo = models.CharField(max_length=8, choices=PROTO_CHOICES)
    servicio = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=16, choices=ESTADO_CHOICES)
    detected_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "puerto_encontrado"
        verbose_name = "Puerto encontrado"
        verbose_name_plural = "Puertos encontrados"
        indexes = [
            models.Index(fields=["puerto", "protocolo"]),
        ]

    def __str__(self) -> str:
        return f"{self.puerto}/{self.protocolo} ({self.estado})"


class PuertoResumen(models.Model):
    """Estado consolidado de puertos observados por host/dispositivo."""

    dispositivo = models.ForeignKey("detector.Dispositivo", on_delete=models.SET_NULL, null=True, blank=True, related_name="puertos_resumen")
    host_ip = models.GenericIPAddressField()
    puerto = models.PositiveIntegerField()
    protocolo = models.CharField(max_length=8, choices=PuertoEncontrado.PROTO_CHOICES)
    servicio = models.CharField(max_length=255, blank=True)
    estado = models.CharField(max_length=16, choices=PuertoEncontrado.ESTADO_CHOICES)
    primera_detectado = models.DateTimeField(default=timezone.now)
    ultima_detectado = models.DateTimeField(default=timezone.now)
    ultima_trabajo = models.ForeignKey(TrabajoScanner, on_delete=models.SET_NULL, null=True, blank=True, related_name="puertos_resumen")

    class Meta:
        db_table = "puerto_resumen"
        verbose_name = "Puerto resumido"
        verbose_name_plural = "Puertos resumidos"
        indexes = [
            models.Index(fields=["host_ip", "puerto", "protocolo"], name="puerto_resumen_host_ip_idx"),
        ]

    def __str__(self) -> str:
        etiqueta = self.dispositivo.hostname if self.dispositivo and self.dispositivo.hostname else self.host_ip
        return f"{etiqueta} :: {self.puerto}/{self.protocolo} ({self.estado})"
