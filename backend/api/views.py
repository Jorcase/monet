from django.db.models import Q, Count
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from datetime import timedelta
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
import threading

from agente.models import AgenteLocal
from agente.services.network_info import collect_network_snapshot
from detector.models import Dispositivo, AnalisisRed, HostDetectado, DispositivoHistorial
from detector.services.runner import run_detector_scan, DetectorRunError
from captura.models import (
    CapturaSesion,
    CapturaArchivo,
    CapturaFlujo,
    CapturaEstadistica,
    FingerprintObservacion,
    DominioCategoria,
)
from captura.services.session import (
    create_capture_session,
    mark_session_state,
    recompute_statistics,
)
from captura.services.sniffer import run_passive_capture, CaptureUnavailable
from django.db import close_old_connections
from escaner.models import TrabajoScanner, PuertoEncontrado, PuertoResumen
from escaner.services.scanner import ejecutar_trabajo
from escaner.services.port_scan import normalize_port_list
from analitica.models import HeuristicaEvento, HeuristicaRegla
from api.serializers import (
    DispositivoSerializer,
    CapturaSesionSerializer,
    CapturaArchivoSerializer,
    CapturaFlujoSerializer,
    CapturaEstadisticaSerializer,
    FingerprintObservacionSerializer,
    DominioCategoriaSerializer,
    TrabajoScannerSerializer,
    PuertoEncontradoSerializer,
    PuertoResumenSerializer,
    HeuristicaEventoSerializer,
    HeuristicaReglaSerializer,
    AgenteLocalSerializer,
    AnalisisRedSerializer,
    HostDetectadoSerializer,
    DispositivoHistorialSerializer,
)


class DispositivoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DispositivoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Dispositivo.objects.filter(Q(owner=user) | Q(owner__isnull=True))
        self._auto_mark_inactive(qs)
        return qs.order_by("-ultima_vez")

    def _auto_mark_inactive(self, queryset):
        stale_threshold = timezone.now() - timedelta(minutes=30)
        stale = queryset.filter(estado="activo", ultima_vez__lt=stale_threshold)
        if stale.exists():
            stale.update(estado="inactivo")


class CapturaSesionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CapturaSesionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            CapturaSesion.objects.filter(Q(owner=user) | Q(owner__isnull=True))
            .annotate(
                archivos_count=Count("archivos", distinct=True),
                flujos_count=Count("flujos", distinct=True),
            )
            .select_related("estadistica")
            .order_by("-inicio")
        )

    def _filter_flows_queryset(self, sesion, request):
        queryset = sesion.flujos.select_related("dispositivo_origen", "dispositivo_destino")
        direccion = request.query_params.get("direccion")
        if direccion in dict(CapturaFlujo.DIRECCION_CHOICES):
            queryset = queryset.filter(direccion=direccion)
        protocolo = request.query_params.get("protocolo")
        if protocolo:
            queryset = queryset.filter(protocolo__iexact=protocolo)
        ip = request.query_params.get("ip")
        if ip:
            queryset = queryset.filter(Q(src_ip__icontains=ip) | Q(dst_ip__icontains=ip))
        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(src_ip__icontains=search)
                | Q(dst_ip__icontains=search)
                | Q(src_mac__icontains=search)
                | Q(dst_mac__icontains=search)
            )
        return queryset.order_by("-ventana_inicio")

    def _limit_queryset(self, queryset, request, default=50, max_items=200):
        try:
            limit = int(request.query_params.get("limit", default))
        except ValueError:
            limit = default
        limit = max(1, min(limit, max_items))
        return queryset[:limit]

    @action(detail=True, methods=["get"], url_path="archivos")
    def archivos(self, request, pk=None):
        sesion = self.get_object()
        archivos = sesion.archivos.order_by("-creado")
        archivos = self._limit_queryset(archivos, request, default=50, max_items=200)
        serializer = CapturaArchivoSerializer(archivos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="flujos")
    def flujos(self, request, pk=None):
        sesion = self.get_object()
        queryset = self._filter_flows_queryset(sesion, request)

        paginator = PageNumberPagination()
        try:
            paginator.page_size = int(request.query_params.get("page_size", 25))
        except ValueError:
            paginator.page_size = 25
        paginator.page_size_query_param = "page_size"
        paginator.max_page_size = 200
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = CapturaFlujoSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=["get"], url_path="estadistica")
    def estadistica(self, request, pk=None):
        sesion = self.get_object()
        estadistica = getattr(sesion, "estadistica", None)
        if not estadistica:
            estadistica = recompute_statistics(sesion)
        serializer = CapturaEstadisticaSerializer(estadistica)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="fingerprints")
    def fingerprints(self, request, pk=None):
        sesion = self.get_object()
        fingerprints = sesion.fingerprints.select_related("dispositivo").order_by("-timestamp")
        fingerprints = self._limit_queryset(fingerprints, request, default=50, max_items=200)
        serializer = FingerprintObservacionSerializer(fingerprints, many=True)
        return Response(serializer.data)


class CapturaRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        interfaz = (request.data.get("interfaz") or "").strip()
        if not interfaz:
            agente = AgenteLocal.objects.order_by("-ultima_actualizacion").first()
            if agente:
                interfaz = agente.interfaz
            else:
                return Response(
                    {"detail": "Debés indicar una interfaz o registrar el agente local."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        modo = request.data.get("modo", "pasiva")
        if modo not in dict(CapturaSesion.MODO_CHOICES):
            return Response({"detail": "Modo inválido."}, status=status.HTTP_400_BAD_REQUEST)

        origen = request.data.get("origen", "manual")
        if origen not in dict(CapturaSesion.ORIGEN_CHOICES):
            return Response({"detail": "Origen inválido."}, status=status.HTTP_400_BAD_REQUEST)

        filtro_bpf = (request.data.get("filtro_bpf") or "").strip()

        try:
            duracion_objetivo = request.data.get("duracion_objetivo")
            duracion_value = int(duracion_objetivo) if duracion_objetivo else None
            if duracion_value is not None and duracion_value <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {"detail": "La duración objetivo debe ser un entero positivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            ventana_segundos = int(request.data.get("ventana", 10))
        except (ValueError, TypeError):
            ventana_segundos = 10
        ventana_segundos = max(1, ventana_segundos)

        sesion = create_capture_session(
            interfaz=interfaz,
            modo=modo,
            origen=origen,
            filtro_bpf=filtro_bpf,
            duracion_objetivo=duracion_value,
            owner=request.user,
        )

        self._launch_passive_capture(
            sesion,
            ventana_segundos=ventana_segundos,
            duracion=duracion_value,
            filtro=filtro_bpf,
            interfaz=interfaz,
        )

        sesion.refresh_from_db()
        serializer = CapturaSesionSerializer(sesion)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _launch_passive_capture(
        self,
        sesion: CapturaSesion,
        *,
        ventana_segundos: int,
        duracion: int | None,
        filtro: str,
        interfaz: str,
    ) -> None:
        def _run():
            close_old_connections()
            try:
                run_passive_capture(
                    sesion,
                    ventana_segundos=ventana_segundos,
                    duracion_segundos=duracion,
                    filtro_bpf=filtro,
                    interfaz=interfaz,
                )
            except CaptureUnavailable as exc:
                mark_session_state(sesion, estado="error", observaciones=str(exc), fin=timezone.now())
            except Exception as exc:  # pragma: no cover - captura en runtime
                mark_session_state(
                    sesion,
                    estado="error",
                    observaciones=f"Error inesperado en captura: {exc}",
                    fin=timezone.now(),
                )
            finally:
                close_old_connections()

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()


class CapturaFinalizarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        sesion = get_object_or_404(CapturaSesion, pk=pk, owner=request.user)
        estado = request.data.get("estado", "completada")
        if estado not in {"completada", "abortada", "error"}:
            return Response({"detail": "Estado inválido."}, status=status.HTTP_400_BAD_REQUEST)

        observaciones = request.data.get("observaciones")
        mark_session_state(
            sesion,
            estado=estado,
            observaciones=observaciones,
            fin=timezone.now(),
        )
        serializer = CapturaSesionSerializer(sesion)
        return Response(serializer.data)


class TrabajoScannerViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TrabajoScannerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TrabajoScanner.objects.filter(
            Q(owner=user) | Q(owner__isnull=True)
        ).order_by('-inicio')
        estado = self.request.query_params.get("estado")
        if estado in dict(TrabajoScanner.ESTADO_CHOICES):
            queryset = queryset.filter(estado=estado)
        tipo = self.request.query_params.get("tipo")
        if tipo in dict(TrabajoScanner.TIPO_CHOICES):
            queryset = queryset.filter(tipo_scan=tipo)
        objetivo = self.request.query_params.get("objetivo")
        if objetivo:
            queryset = queryset.filter(objetivo__icontains=objetivo)
        return queryset[:50]


class PuertoEncontradoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PuertoEncontradoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            PuertoEncontrado.objects.select_related('trabajo')
            .filter(
                Q(trabajo__owner=user)
                | Q(trabajo__owner__isnull=True)
                | Q(dispositivo__owner=user)
            )
            .order_by('-detected_at')
        )
        trabajo_id = self.request.query_params.get("trabajo_id")
        if trabajo_id:
            queryset = queryset.filter(trabajo_id=trabajo_id)
        host_ip = self.request.query_params.get("host_ip")
        if host_ip:
            queryset = queryset.filter(host_ip=host_ip)
        protocolo = self.request.query_params.get("protocolo")
        if protocolo in dict(PuertoEncontrado.PROTO_CHOICES):
            queryset = queryset.filter(protocolo=protocolo)
        estado = self.request.query_params.get("estado")
        if estado in dict(PuertoEncontrado.ESTADO_CHOICES):
            queryset = queryset.filter(estado=estado)
        try:
            limit = int(self.request.query_params.get("limit", 200))
        except ValueError:
            limit = 200
        limit = max(1, min(limit, 1000))
        if getattr(self, "action", None) == "list":
            return queryset[:limit]
        return queryset


class PuertoResumenViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PuertoResumenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = PuertoResumen.objects.select_related('dispositivo').filter(
            Q(dispositivo__owner=user) | Q(dispositivo__isnull=True)
        )
        host_ip = self.request.query_params.get("host_ip")
        if host_ip:
            queryset = queryset.filter(host_ip=host_ip)
        dispositivo_id = self.request.query_params.get("dispositivo_id")
        if dispositivo_id:
            queryset = queryset.filter(dispositivo_id=dispositivo_id)
        protocolo = self.request.query_params.get("protocolo")
        if protocolo in dict(PuertoEncontrado.PROTO_CHOICES):
            queryset = queryset.filter(protocolo=protocolo)
        puerto = self.request.query_params.get("puerto")
        if puerto and puerto.isdigit():
            queryset = queryset.filter(puerto=int(puerto))
        estado = self.request.query_params.get("estado")
        if estado in dict(PuertoEncontrado.ESTADO_CHOICES):
            queryset = queryset.filter(estado=estado)
        queryset = queryset.order_by("-ultima_detectado")
        try:
            limit = int(self.request.query_params.get("limit", 200))
        except ValueError:
            limit = 200
        limit = max(1, min(limit, 1000))
        if getattr(self, "action", None) == "list":
            return queryset[:limit]
        return queryset


def _eventos_queryset_base(user):
    return HeuristicaEvento.objects.select_related(
        "dispositivo",
        "regla",
        "captura_sesion",
        "analisis",
        "puerto_resumen",
        "captura_flujo",
    ).filter(
        Q(owner=user)
        | Q(dispositivo__owner=user)
        | Q(analisis__owner=user)
        | Q(captura_sesion__owner=user)
    )


class HeuristicaEventoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HeuristicaEventoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = _eventos_queryset_base(user)

        severidad = self.request.query_params.get("severidad")
        if severidad in dict(HeuristicaRegla.SEVERIDAD_CHOICES):
            queryset = queryset.filter(severidad=severidad)

        modulo = self.request.query_params.get("modulo")
        if modulo in dict(HeuristicaRegla.MODULO_CHOICES):
            queryset = queryset.filter(regla__modulo_objetivo=modulo)

        regla_id = self.request.query_params.get("regla_id")
        if regla_id:
            queryset = queryset.filter(regla_id=regla_id)

        dispositivo_id = self.request.query_params.get("dispositivo_id")
        if dispositivo_id:
            queryset = queryset.filter(dispositivo_id=dispositivo_id)

        notificado = self.request.query_params.get("notificado")
        if notificado in {"true", "false"}:
            queryset = queryset.filter(notificado=notificado == "true")

        desde = self.request.query_params.get("desde")
        if desde:
            parsed = parse_datetime(desde)
            if parsed:
                queryset = queryset.filter(ts__gte=parsed)
        hasta = self.request.query_params.get("hasta")
        if hasta:
            parsed = parse_datetime(hasta)
            if parsed:
                queryset = queryset.filter(ts__lte=parsed)

        try:
            limit = int(self.request.query_params.get("limit", 200))
        except ValueError:
            limit = 200
        limit = max(1, min(limit, 500))

        return queryset.order_by('-ts')[:limit]

    @action(detail=True, methods=["post"], url_path="notificado")
    def marcar_notificado(self, request, pk=None):
        evento = self.get_object()
        notificado_flag = request.data.get("notificado", True)
        notificado = (
            notificado_flag
            if isinstance(notificado_flag, bool)
            else str(notificado_flag).strip().lower() not in {"false", "0", "", "no"}
        )
        evento.notificado = notificado
        evento.save(update_fields=["notificado"])
        serializer = self.get_serializer(evento)
        return Response(serializer.data)


class HeuristicaEventoNotificadoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        queryset = _eventos_queryset_base(request.user)
        evento = get_object_or_404(queryset, pk=pk)
        notificado_flag = request.data.get("notificado", True)
        notificado = (
            notificado_flag
            if isinstance(notificado_flag, bool)
            else str(notificado_flag).strip().lower() not in {"false", "0", "", "no"}
        )
        evento.notificado = notificado
        evento.save(update_fields=["notificado"])
        serializer = HeuristicaEventoSerializer(evento)
        return Response(serializer.data)


class HeuristicaReglaViewSet(viewsets.ModelViewSet):
    serializer_class = HeuristicaReglaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = HeuristicaRegla.objects.all().order_by('nombre')
        modulo = self.request.query_params.get("modulo")
        if modulo in dict(HeuristicaRegla.MODULO_CHOICES):
            queryset = queryset.filter(modulo_objetivo=modulo)
        tipo = self.request.query_params.get("tipo")
        if tipo in dict(HeuristicaRegla.TIPO_CHOICES):
            queryset = queryset.filter(tipo=tipo)
        activa = self.request.query_params.get("activa")
        if activa in {"true", "false"}:
            queryset = queryset.filter(activa=activa == "true")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(nombre__icontains=search)
        return queryset

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class DominioCategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = DominioCategoriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DominioCategoria.objects.all().order_by("sufijo")



class AgenteStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        agente = AgenteLocal.objects.order_by("-ultima_actualizacion").first()
        if not agente:
            return Response({"detail": "Aún no se registró el agente local."}, status=status.HTTP_404_NOT_FOUND)
        data = AgenteLocalSerializer(agente).data
        return Response(data)


class AgenteRefreshView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        interfaz = request.data.get("interfaz") or request.query_params.get("interfaz")
        ubicacion = request.data.get("ubicacion")
        try:
            snapshot = collect_network_snapshot(interface_preferida=interfaz or None)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        ubicacion_value = (ubicacion or "").strip()
        snapshot["ultima_actualizacion"] = timezone.now()
        snapshot["ubicacion"] = ubicacion_value

        agente, _ = AgenteLocal.objects.update_or_create(
            mac=snapshot["mac"],
            ubicacion_slug=ubicacion_value.lower(),
            defaults=snapshot,
        )

        serializer = AgenteLocalSerializer(agente)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AgenteHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        limit = max(1, min(limit, 100))

        historial = AgenteLocal.objects.order_by("-ultima_actualizacion")[:limit]
        serializer = AgenteLocalSerializer(historial, many=True)
        return Response(serializer.data)


class AnalisisRedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        limit = max(1, min(limit, 100))

        user = request.user
        queryset = (
            AnalisisRed.objects.prefetch_related("hosts_detectados")
            .filter(Q(owner=user) | Q(owner__isnull=True))
            .order_by("-inicio")[:limit]
        )
        serializer = AnalisisRedSerializer(queryset, many=True)
        return Response(serializer.data)


class HostDetectadoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        analisis_id = request.query_params.get("analisis_id")
        host_id = request.query_params.get("host_id")
        mac_filter = request.query_params.get("mac")
        ip_filter = request.query_params.get("ip")
        user = request.user
        queryset = HostDetectado.objects.select_related("analisis").filter(
            Q(analisis__owner=user) | Q(analisis__owner__isnull=True)
        )
        if analisis_id:
            queryset = queryset.filter(analisis_id=analisis_id)
        if host_id:
            try:
                queryset = queryset.filter(id=int(host_id))
            except (TypeError, ValueError):
                queryset = queryset.none()
        if mac_filter:
            queryset = queryset.filter(mac__iexact=mac_filter.strip())
        if ip_filter:
            queryset = queryset.filter(ip=ip_filter.strip())

        try:
            limit = int(request.query_params.get("limit", 200))
        except ValueError:
            limit = 200
        limit = max(1, min(limit, 1000))

        serializer = HostDetectadoSerializer(queryset.order_by("-ultima_vista")[:limit], many=True)
        return Response(serializer.data)


class DispositivoHistorialView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, dispositivo_id):
        user = request.user
        queryset = DispositivoHistorial.objects.select_related("dispositivo").filter(
            dispositivo_id=dispositivo_id,
            dispositivo__owner=user,
        )
        serializer = DispositivoHistorialSerializer(
            queryset.order_by("-inicio")[:200],
            many=True,
        )
        return Response(serializer.data)


class DetectorScanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        interfaz = request.data.get("interfaz")
        tipo = request.data.get("tipo")
        fingerprint_os = bool(request.data.get("fingerprint_os"))
        arp_mode = (request.data.get("arp_mode") or "rapido").lower()
        if arp_mode not in {"rapido", "completo"}:
            return Response({"detail": "Modo ARP inválido."}, status=status.HTTP_400_BAD_REQUEST)
        attempts = 3 if arp_mode == "completo" else 1
        rest = 0.5 if arp_mode == "completo" else 0.0

        if tipo and tipo not in dict(AnalisisRed.TIPO_CHOICES):
            return Response(
                {"detail": "Tipo de análisis inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            analisis = run_detector_scan(
                interface=interfaz,
                owner_username=request.user.username,
                scan_type=tipo,
                fingerprint_os=fingerprint_os,
                arp_attempts=attempts,
                arp_rest=rest,
            )
        except DetectorRunError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AnalisisRedSerializer(analisis)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ScannerRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        include_local = bool(request.data.get("include_local"))
        include_active = bool(request.data.get("include_active_devices"))
        manual_targets = request.data.get("targets") or []
        analisis_ids = request.data.get("analisis_ids") or []
        if isinstance(manual_targets, str):
            manual_targets = [manual_targets]
        if isinstance(analisis_ids, str):
            analisis_ids = [analisis_ids]

        targets = self._build_targets(
            include_local=include_local,
            manual_targets=manual_targets,
            include_active=include_active,
            analisis_ids=analisis_ids,
            user=user,
        )
        if not targets:
            return Response(
                {"detail": "Debés indicar al menos un objetivo para escanear."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tipo = request.data.get("tipo", "rapido")
        valid_types = dict(TrabajoScanner.TIPO_CHOICES)
        if tipo not in valid_types:
            return Response({"detail": "Tipo de escaneo inválido."}, status=status.HTTP_400_BAD_REQUEST)

        puertos = None
        if tipo == "personalizado":
            puertos_raw = (request.data.get("puertos") or "").strip()
            if not puertos_raw:
                return Response(
                    {"detail": "Debés indicar los puertos a escanear cuando el tipo es personalizado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                puertos = normalize_port_list(puertos_raw)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        analisis_obj = None
        analisis_id = request.data.get("analisis_id")
        if analisis_id:
            analisis_obj = get_object_or_404(
                AnalisisRed.objects.filter(Q(owner=user) | Q(owner__isnull=True)),
                pk=analisis_id,
            )

        trabajo = TrabajoScanner.objects.create(
            analisis=analisis_obj,
            objetivo=", ".join(targets),
            tipo_scan=tipo,
            estado="pendiente",
            owner=user,
        )
        if puertos:
            trabajo.notas = f"Puertos personalizados: {puertos}"
            trabajo.save(update_fields=["notas"])

        self._launch_scan(trabajo, targets, tipo, puertos)
        serializer = TrabajoScannerSerializer(trabajo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _build_targets(self, *, include_local: bool, manual_targets, include_active: bool, analisis_ids, user):
        targets: list[str] = []
        if include_local:
            targets.append("127.0.0.1")

        if manual_targets:
            if isinstance(manual_targets, str):
                manual_targets = manual_targets.split(",")
            for entry in manual_targets:
                if entry:
                    targets.append(entry.strip())

        if include_active:
            activos = (
                Dispositivo.objects.filter(
                    Q(owner=user) | Q(owner__isnull=True),
                    estado="activo",
                )
                .exclude(ip="")
                .values_list("ip", flat=True)
            )
            targets.extend(list(activos))

        if analisis_ids:
            try:
                ids = [int(pk) for pk in analisis_ids]
            except (TypeError, ValueError):
                ids = []
            if ids:
                hosts = (
                    HostDetectado.objects.filter(analisis_id__in=ids)
                    .filter(Q(analisis__owner=user) | Q(analisis__owner__isnull=True))
                    .values_list("ip", flat=True)
                )
                targets.extend(list(hosts))

        cleaned: list[str] = []
        seen = set()
        for ip in targets:
            ip = (ip or "").strip()
            if not ip or ip in seen:
                continue
            seen.add(ip)
            cleaned.append(ip)
        return cleaned

    def _launch_scan(self, trabajo, targets, tipo, puertos):
        def _run():
            close_old_connections()
            try:
                ejecutar_trabajo(trabajo, targets, tipo_scan=tipo, puertos=puertos)
            finally:
                close_old_connections()

        threading.Thread(target=_run, daemon=True).start()
