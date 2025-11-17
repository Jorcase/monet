from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

class AnalisisRed(models.Model):
    TIPO_CHOICES = [
        ("arp_rapido", "ARP rápido"),
        ("arp_completo", "ARP completo"),
        ("mixto", "Mixto ARP + fingerprint"),
    ] 
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analisis_red",
    )
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True,blank=True)
    interfaz = models.CharField(max_length=64)
    tipo = models.CharField(max_length=32, choices=TIPO_CHOICES)
    total_hosts_detectados = models.PositiveIntegerField(default=0)
    duracion_ms = models.PositiveIntegerField(null=True, blank=True)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "analisis_red"
        verbose_name = "Analisis de red"
        verbose_name_plural = "Analisis de redes"

    def __str__(self):
        return f"{self.get_tipo_display()} @ {self.interfaz} ({self.inicio:%Y-%m-%d %H:%M})"
    
class Dispositivo(models.Model):
    ESTADO_CHOICES = [
        ("activo","Activo"),
        ("inactivo","Inactivo"),
        ("desconocido","Desconocido"),
    ]
    TIPO_CHOICES = [
        ("desconocido", "Desconocido"),
        ("pc", "PC / Notebook"),
        ("movil", "Móvil / Tablet"),
        ("tv", "Smart TV"),
        ("iot", "IoT / Hogar"),
        ("impresora", "Impresora / Periférico"),
        ("router", "Router / Infraestructura"),
        ("servidor", "Servidor / Appliance"),
    ]
    FUENTE_CHOICES = [
        ("sin_datos", "Sin datos"),
        ("detector", "Detector"),
        ("captura", "Captura"),
        ("manual", "Manual"),
    ]
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="dispositivos",
    )
    ip = models.GenericIPAddressField()
    mac = models.CharField(max_length=32, unique=True)
    hostname =  models.CharField(max_length=255,blank=True)
    hostname_fuente = models.CharField(max_length=16, choices=FUENTE_CHOICES, default="sin_datos")
    mac_aleatoria = models.BooleanField(default=False)
    vendor = models.CharField(max_length=64, blank=True)
    primera_vez = models.DateTimeField(default=timezone.now)
    ultima_vez = models.DateTimeField(default=timezone.now)
    estado = models.CharField(max_length=32, choices=ESTADO_CHOICES, default="desconocido")
    tipo_dispositivo = models.CharField(max_length=16, choices=TIPO_CHOICES, default="desconocido")
    tipo_fuente = models.CharField(max_length=16, choices=[("sin_datos","Sin datos"),("heuristica","Heurística"),("manual","Manual")], default="sin_datos")
    sistema_operativo = models.CharField(max_length=128, blank=True)
    fuente_fingerprint = models.CharField(max_length=32, blank=True)
    ultima_fingerprint = models.DateTimeField(null=True, blank=True)


    class Meta:
        db_table = "dispositivo"
        verbose_name = "Dispositivo"
        verbose_name_plural = "Dispositivos"
        constraints = []

    def __str__(self):
        return f"{self.hostname or self.mac} ({self.ip})"
    
class HostDetectado(models.Model):
    METODO_CHOICES = [
        ("arp", "ARP"),
        ("ping", "Ping"),
        ("nmap", "Nmap"),
        ("passive", "Pasivo"),
        ("otro", "Otro"),
    ]
    analisis = models.ForeignKey(AnalisisRed, on_delete=models.CASCADE, related_name="hosts_detectados")
    ip = models.GenericIPAddressField()
    mac = models.CharField(max_length=32,blank=True)
    metodo_deteccion = models.CharField(max_length=32, choices=METODO_CHOICES)
    latencia_ms = models.PositiveIntegerField(null=True,blank=True)
    hostname = models.CharField(max_length=255,blank=True)
    primera_vista = models.DateTimeField(default=timezone.now)
    ultima_vista = models.DateTimeField(default=timezone.now)
    notas = models.TextField(blank=True)

    class Meta:
        db_table = "host_detectado"
        verbose_name = "Host detectado"
        verbose_name_plural = "Hosts detectados"

    def __str__(self):
         return f"{self.ip} ({self.get_metodo_deteccion_display()})"

class DispositivoHistorial(models.Model):
    MOTIVO_CHOICES = [
            ("dhcp", "Asignación DHCP"),
            ("reasignacion", "Reasignación"),
            ("manual", "Cambio manual"),
            ("otro", "Otro"),
        ]
    dispositivo = models.ForeignKey(Dispositivo, on_delete=models.CASCADE, related_name="historiales")
    ip = models.GenericIPAddressField()
    mac = models.CharField(max_length=32)
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True,blank=True)
    motivo = models.CharField(max_length=32, choices=MOTIVO_CHOICES , default="otro")

    class Meta:
        db_table = "dispositivo_historial"
        verbose_name = "Historial de dispositivo"
        verbose_name_plural = "Historiales de dispositivos"

    def __str__(self):
        return f"{self.dispositivo} ({self.inicio:%Y-%m-%d %H:%M})"
