from django.db import models
from django.utils import timezone

class AnalisisRed(models.Model):
    TIPO_CHOICES = [
        ("escaner-activo","Escaner activo"),
        ("captura-pasiva", "Captura pasiva"),
        ("mixto","Mixto"),
    ] 


    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True,blank=True)
    interfaz = models.CharField(max_length=64)
    tipo = models.CharField(max_length=32, choices=TIPO_CHOICES)
    total_hosts_detectados = models.PositiveIntegerField(default=0)
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
    ip = models.GenericIPAddressField()
    mac =  models.CharField(max_length=32,unique=True)
    hostname =  models.CharField(max_length=255,blank=True)
    primera_vez = models.DateTimeField(default=timezone.now)
    ultima_vez = models.DateTimeField(default=timezone.now)
    estado = models.CharField(max_length=32, choices=ESTADO_CHOICES, default="desconocido")

    class Meta:
        db_table = "dispositivo"
        verbose_name = "Dispositivo"
        verbose_name_plural = "Dispositivos"

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