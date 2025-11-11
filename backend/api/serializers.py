from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from captura.models import CapturaSesion, CapturaFlujo
from detector.models import Dispositivo
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
            "vendor",
            "estado",
            "tipo_dispositivo",
            "tipo_fuente",
            "metodo_identificacion",
            "sistema_operativo",
            "fuente_fingerprint",
            "ultima_fingerprint",
            "ultima_vez",
        ]


class CapturaFlujoSerializer(serializers.ModelSerializer):
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
            "protocolo",
            "paquetes",
            "bytes",
            "ttl_promedio",
            "tcp_window_promedio",
            "tcp_mss",
            "tcp_opciones",
        ]


class CapturaSesionSerializer(serializers.ModelSerializer):
    flujos = CapturaFlujoSerializer(many=True, read_only=True)

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
            "total_paquetes",
            "total_bytes",
            "paquetes_descartados",
            "ruta_pcap",
            "observaciones",
            "flujos",
        ]


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
