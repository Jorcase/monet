from django.conf import settings
from django.db import models
from django.utils import timezone


class HeuristicaRegla(models.Model):
    MODULO_CHOICES = [
        ("captura", "Captura"),
        ("detector", "Detección de hosts"),
        ("escaner", "Escáner de puertos"),
        ("global", "Global"),
    ]

    TIPO_CHOICES = [
        ("comportamiento", "Comportamiento"),
        ("firma", "Firma"),
        ("fingerprinting", "Fingerprinting"),
        ("otro", "Otro"),
    ]

    SEVERIDAD_CHOICES = [
        ("baja", "Baja"),
        ("media", "Media"),
        ("alta", "Alta"),
        ("critica", "Crítica"),
    ]

    nombre = models.CharField(max_length=128, unique=True)
    modulo_objetivo = models.CharField(max_length=16, choices=MODULO_CHOICES, default="captura")
    tipo = models.CharField(max_length=32, choices=TIPO_CHOICES, default="comportamiento")
    descripcion = models.TextField(blank=True)
    severidad_por_defecto = models.CharField(max_length=16, choices=SEVERIDAD_CHOICES, default="media")
    parametros = models.JSONField(blank=True, default=dict, help_text="Configuración dinámica de la regla.")
    activa = models.BooleanField(default=True)
    creada = models.DateTimeField(auto_now_add=True)
    actualizada = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "heuristica_regla"
        verbose_name = "Regla de heurística"
        verbose_name_plural = "Reglas de heurística"
        ordering = ("nombre",)

    def __str__(self) -> str:
        return self.nombre


class HeuristicaEvento(models.Model):
    SEVERIDAD_CHOICES = HeuristicaRegla.SEVERIDAD_CHOICES

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eventos_heuristica",
    )
    regla = models.ForeignKey(
        HeuristicaRegla,
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    captura_sesion = models.ForeignKey(
        "captura.CapturaSesion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_heuristica",
    )
    captura_flujo = models.ForeignKey(
        "captura.CapturaFlujo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_heuristica",
    )
    analisis = models.ForeignKey(
        "detector.AnalisisRed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_heuristica",
    )
    dispositivo = models.ForeignKey(
        "detector.Dispositivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_heuristica",
    )
    puerto_resumen = models.ForeignKey(
        "escaner.PuertoResumen",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_heuristica",
    )
    severidad = models.CharField(max_length=16, choices=SEVERIDAD_CHOICES, default="media")
    descripcion = models.TextField()
    evidencia = models.JSONField(blank=True, default=dict)
    notificado = models.BooleanField(default=False)
    ts = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "heuristica_evento"
        verbose_name = "Evento heurístico"
        verbose_name_plural = "Eventos heurísticos"
        ordering = ("-ts",)
        indexes = [
            models.Index(fields=["ts"]),
            models.Index(fields=["severidad"]),
        ]

    def __str__(self) -> str:
        return f"{self.regla.nombre} [{self.severidad}]"
