from django.conf import settings
from django.db import models
from django.utils import timezone


class CapturaSesion(models.Model):
    MODO_CHOICES = [
        ("pasiva", "Pasiva"),
    ]

    ORIGEN_CHOICES = [
        ("manual", "Manual"),
        ("cron", "Programada"),
        ("api", "API / Remota"),
    ]

    ESTADO_CHOICES = [
        ("pendiente", "Pendiente"),
        ("capturando", "Capturando"),
        ("completada", "Completada"),
        ("abortada", "Abortada"),
        ("error", "Error"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="capturas",
    )
    interfaz = models.CharField(max_length=64)
    modo = models.CharField(max_length=16, choices=MODO_CHOICES, default="pasiva")
    origen = models.CharField(max_length=16, choices=ORIGEN_CHOICES, default="manual")
    filtro_bpf = models.CharField(max_length=255, blank=True) 
    duracion_objetivo = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Duración planeada en segundos.",
    )
    estado = models.CharField(max_length=16, choices=ESTADO_CHOICES, default="pendiente")
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True, blank=True)
    total_paquetes = models.BigIntegerField(default=0)
    total_bytes = models.BigIntegerField(default=0)
    paquetes_descartados = models.BigIntegerField(default=0)
    ruta_pcap = models.CharField(max_length=512, blank=True)
    hash_pcap = models.CharField(max_length=128, blank=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        db_table = "captura_sesion"
        verbose_name = "Sesión de captura"
        verbose_name_plural = "Sesiones de captura"
        ordering = ("-inicio",)

    def __str__(self) -> str:
        return f"{self.get_modo_display()} @ {self.interfaz} ({self.inicio:%Y-%m-%d %H:%M})"


class CapturaArchivo(models.Model):
    TIPO_CHOICES = [
        ("pcap", "PCAP"),
        ("resumen", "Resumen"),
        ("otro", "Otro"),
    ]

    sesion = models.ForeignKey(
        CapturaSesion,
        on_delete=models.CASCADE,
        related_name="archivos",
    )
    tipo = models.CharField(max_length=16, choices=TIPO_CHOICES, default="pcap")
    ruta = models.CharField(max_length=512)
    tamano_bytes = models.BigIntegerField(default=0)
    hash_archivo = models.CharField(max_length=128, blank=True)
    protegido = models.BooleanField(default=False)
    expira_en = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "captura_archivo"
        verbose_name = "Archivo de captura"
        verbose_name_plural = "Archivos de captura"
        ordering = ("-creado",)

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} - {self.ruta}"


class CapturaFlujo(models.Model):
    DIRECCION_CHOICES = [
        ("entrada", "Entrada"),
        ("salida", "Salida"),
        ("ambas", "Ambas"),
    ]

    sesion = models.ForeignKey(
        CapturaSesion,
        on_delete=models.CASCADE,
        related_name="flujos",
    )
    ventana_inicio = models.DateTimeField()
    ventana_fin = models.DateTimeField()
    direccion = models.CharField(max_length=16, choices=DIRECCION_CHOICES, default="ambas")
    src_ip = models.GenericIPAddressField()
    dst_ip = models.GenericIPAddressField()
    src_port = models.PositiveIntegerField(null=True, blank=True)
    dst_port = models.PositiveIntegerField(null=True, blank=True)
    src_mac = models.CharField(max_length=32, blank=True)
    dst_mac = models.CharField(max_length=32, blank=True)
    protocolo = models.CharField(max_length=16)
    paquetes = models.BigIntegerField(default=0)
    bytes = models.BigIntegerField(default=0)
    flag_syn = models.BooleanField(default=False)
    flag_fin = models.BooleanField(default=False)
    flag_rst = models.BooleanField(default=False)
    ttl_promedio = models.PositiveIntegerField(null=True, blank=True)
    tcp_window_promedio = models.PositiveIntegerField(null=True, blank=True)
    tcp_mss = models.PositiveIntegerField(null=True, blank=True)
    tcp_opciones = models.CharField(max_length=128, blank=True)
    payload_muestra = models.TextField(blank=True)
    dispositivo_origen = models.ForeignKey(
        "detector.Dispositivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flujos_origen",
    )
    dispositivo_destino = models.ForeignKey(
        "detector.Dispositivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flujos_destino",
    )

    class Meta:
        db_table = "captura_flujo"
        verbose_name = "Flujo capturado"
        verbose_name_plural = "Flujos capturados"
        indexes = [
            models.Index(fields=["sesion", "ventana_inicio"]),
            models.Index(fields=["src_ip", "dst_ip"]),
            models.Index(fields=["protocolo"]),
        ]

    def __str__(self) -> str:
        return f"{self.src_ip}:{self.src_port or '-'} -> {self.dst_ip}:{self.dst_port or '-'} ({self.protocolo})"


class CapturaEstadistica(models.Model):
    sesion = models.OneToOneField(
        CapturaSesion,
        on_delete=models.CASCADE,
        related_name="estadistica",
    )
    hosts_unicos = models.PositiveIntegerField(default=0)
    puertos_unicos = models.PositiveIntegerField(default=0)
    protocolos_top = models.JSONField(blank=True, default=dict)
    ancho_banda_promedio = models.FloatField(null=True, blank=True, help_text="Mbps promedio.")
    ancho_banda_pico = models.FloatField(null=True, blank=True, help_text="Mbps pico.")
    alertas_generadas = models.PositiveIntegerField(default=0)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "captura_estadistica"
        verbose_name = "Estadística de captura"
        verbose_name_plural = "Estadísticas de captura"

    def __str__(self) -> str:
        return f"Resumen sesión #{self.sesion_id}"


class FingerprintObservacion(models.Model):
    METODO_CHOICES = [
        ("pasivo", "Pasivo"),
        ("activo", "Activo"),
    ]

    sesion = models.ForeignKey(
        CapturaSesion,
        on_delete=models.CASCADE,
        related_name="fingerprints",
    )
    dispositivo = models.ForeignKey(
        "detector.Dispositivo",
        on_delete=models.CASCADE,
        related_name="fingerprints",
    )
    metodo = models.CharField(max_length=16, choices=METODO_CHOICES, default="pasivo")
    sistema_estimado = models.CharField(max_length=128, blank=True)
    version_estimado = models.CharField(max_length=128, blank=True)
    probabilidad = models.FloatField(null=True, blank=True, help_text="Valor entre 0 y 1.")
    evidencia = models.JSONField(blank=True, default=dict)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "fingerprint_observacion"
        verbose_name = "Observación de fingerprint"
        verbose_name_plural = "Observaciones de fingerprint"
        ordering = ("-timestamp",)
        indexes = [
            models.Index(fields=["dispositivo", "-timestamp"]),
            models.Index(fields=["metodo"]),
        ]

    def __str__(self) -> str:
        return f"{self.dispositivo} ({self.get_metodo_display()})"
