from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from agente.models import AgenteLocal
from captura.models import (
    CapturaSesion,
    CapturaFlujo,
    CapturaArchivo,
    CapturaEstadistica,
    CapturaAccionActiva,
    FingerprintObservacion,
)
from detector.models import Dispositivo, AnalisisRed, HostDetectado, DispositivoHistorial
from escaner.models import TrabajoScanner, PuertoEncontrado, PuertoResumen
from analitica.models import HeuristicaEvento

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está registrado.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.pop("password_confirm", None)
        return User.objects.create_user(password=password, **validated_data)

class DispositivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispositivo
        fields = [
            "id",
            "hostname",
            "hostname_fuente",
            "ip",
            "mac",
            "mac_aleatoria",
            "es_temporal",
            "vendor",
            "estado",
            "tipo_dispositivo",
            "tipo_fuente",
            "metodo_identificacion",
            "sistema_operativo",
            "fuente_fingerprint",
            "primera_vez",
            "ultima_fingerprint",
            "ultima_vez",
        ]


class CapturaFlujoSerializer(serializers.ModelSerializer):
    dispositivo_origen = DispositivoSerializer(read_only=True)
    dispositivo_destino = DispositivoSerializer(read_only=True)

    class Meta:
        model = CapturaFlujo
        fields = [
            "id",
            "ventana_inicio",
            "ventana_fin",
            "direccion",
            "src_ip",
            "dst_ip",
            "src_port",
            "dst_port",
            "src_mac",
            "dst_mac",
            "protocolo",
            "paquetes",
            "bytes",
            "flag_syn",
            "flag_fin",
            "flag_rst",
            "ttl_promedio",
            "tcp_window_promedio",
            "tcp_mss",
            "tcp_opciones",
            "payload_muestra",
            "dispositivo_origen",
            "dispositivo_destino",
        ]


class CapturaArchivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapturaArchivo
        fields = [
            "id",
            "tipo",
            "ruta",
            "tamano_bytes",
            "hash_archivo",
            "protegido",
            "expira_en",
            "creado",
        ]


class CapturaEstadisticaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapturaEstadistica
        fields = [
            "hosts_unicos",
            "puertos_unicos",
            "protocolos_top",
            "ancho_banda_promedio",
            "ancho_banda_pico",
            "alertas_generadas",
            "actualizado",
        ]


class CapturaAccionActivaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapturaAccionActiva
        fields = [
            "id",
            "tipo",
            "objetivo",
            "puerto",
            "payload",
            "resultado",
            "exitoso",
            "observaciones",
            "ejecutada_en",
        ]


class FingerprintObservacionSerializer(serializers.ModelSerializer):
    dispositivo = DispositivoSerializer(read_only=True)

    class Meta:
        model = FingerprintObservacion
        fields = [
            "id",
            "metodo",
            "sistema_estimado",
            "version_estimado",
            "probabilidad",
            "evidencia",
            "timestamp",
            "dispositivo",
        ]


class CapturaSesionSerializer(serializers.ModelSerializer):
    estadistica_resumen = CapturaEstadisticaSerializer(source="estadistica", read_only=True)
    tiene_estadistica = serializers.SerializerMethodField()
    archivos_count = serializers.SerializerMethodField()
    flujos_count = serializers.SerializerMethodField()
    acciones_count = serializers.SerializerMethodField()

    class Meta:
        model = CapturaSesion
        fields = [
            "id",
            "interfaz",
            "modo",
            "origen",
            "estado",
            "inicio",
            "fin",
            "duracion_objetivo",
            "filtro_bpf",
            "total_paquetes",
            "total_bytes",
            "paquetes_descartados",
            "ruta_pcap",
            "hash_pcap",
            "observaciones",
            "archivos_count",
            "flujos_count",
            "acciones_count",
            "tiene_estadistica",
            "estadistica_resumen",
        ]

    def get_tiene_estadistica(self, obj: CapturaSesion) -> bool:
        try:
            return obj.estadistica is not None
        except CapturaEstadistica.DoesNotExist:
            return False

    def get_archivos_count(self, obj: CapturaSesion) -> int:
        annotated = getattr(obj, "archivos_count", None)
        if annotated is not None:
            return annotated
        return obj.archivos.count()

    def get_flujos_count(self, obj: CapturaSesion) -> int:
        annotated = getattr(obj, "flujos_count", None)
        if annotated is not None:
            return annotated
        return obj.flujos.count()

    def get_acciones_count(self, obj: CapturaSesion) -> int:
        annotated = getattr(obj, "acciones_count", None)
        if annotated is not None:
            return annotated
        return obj.acciones_activas.count()


class TrabajoScannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrabajoScanner
        fields = [
            "id",
            "objetivo",
            "tipo_scan",
            "estado",
            "inicio",
            "fin",
            "notas",
        ]


class PuertoEncontradoSerializer(serializers.ModelSerializer):
    trabajo = TrabajoScannerSerializer(read_only=True)

    class Meta:
        model = PuertoEncontrado
        fields = [
            "id",
            "host_ip",
            "puerto",
            "protocolo",
            "servicio",
            "estado",
            "detected_at",
            "trabajo",
        ]


class PuertoResumenSerializer(serializers.ModelSerializer):
    dispositivo = DispositivoSerializer(read_only=True)

    class Meta:
        model = PuertoResumen
        fields = [
            "id",
            "host_ip",
            "puerto",
            "protocolo",
            "servicio",
            "estado",
            "primera_detectado",
            "ultima_detectado",
            "dispositivo",
        ]


class HeuristicaEventoSerializer(serializers.ModelSerializer):
    dispositivo = DispositivoSerializer(read_only=True)

    class Meta:
        model = HeuristicaEvento
        fields = [
            "id",
            "regla",
            "severidad",
            "descripcion",
            "evidencia",
            "notificado",
            "ts",
            "dispositivo",
        ]


class AgenteLocalSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgenteLocal
        fields = [
            "id",
            "interfaz",
            "ip_local",
            "cidr",
            "mac",
            "hostname",
            "ultima_actualizacion",
            "ubicacion",
        ]


class HostDetectadoSerializer(serializers.ModelSerializer):
    device_info = serializers.SerializerMethodField()

    class Meta:
        model = HostDetectado
        fields = [
            "id",
            "ip",
            "mac",
            "hostname",
            "metodo_deteccion",
            "latencia_ms",
            "primera_vista",
            "ultima_vista",
            "notas",
            "device_info",
        ]

    def get_device_info(self, obj: HostDetectado):
        if not obj.mac:
            return None
        dispositivo = Dispositivo.objects.filter(mac__iexact=obj.mac).first()
        if not dispositivo:
            return None
        return {
            "id": dispositivo.id,
            "vendor": dispositivo.vendor,
            "mac_aleatoria": dispositivo.mac_aleatoria,
            "primera_vez": dispositivo.primera_vez,
            "ultima_vez": dispositivo.ultima_vez,
            "estado": dispositivo.estado,
        }


class AnalisisRedSerializer(serializers.ModelSerializer):
    hosts_detectados = HostDetectadoSerializer(many=True, read_only=True)

    class Meta:
        model = AnalisisRed
        fields = [
            "id",
            "inicio",
            "fin",
            "interfaz",
            "tipo",
            "total_hosts_detectados",
            "duracion_ms",
            "notas",
            "hosts_detectados",
        ]


class DispositivoHistorialSerializer(serializers.ModelSerializer):
    dispositivo = serializers.StringRelatedField()

    class Meta:
        model = DispositivoHistorial
        fields = [
            "id",
            "dispositivo",
            "ip",
            "mac",
            "inicio",
            "fin",
            "motivo",
        ]
