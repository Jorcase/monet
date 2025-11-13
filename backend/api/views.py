from django.db.models import Q, Count
from django.utils import timezone
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
    CapturaAccionActiva,
    FingerprintObservacion,
)
from captura.services.session import (
    create_capture_session,
    mark_session_state,
    recompute_statistics,
    increment_session_counters,
)
from captura.services.sniffer import run_passive_capture, CaptureUnavailable
from captura.services.active import run_active_probe
from django.db import close_old_connections
from escaner.models import TrabajoScanner, PuertoEncontrado, PuertoResumen
from analitica.models import HeuristicaEvento
from api.serializers import (
    DispositivoSerializer,
    CapturaSesionSerializer,
    CapturaArchivoSerializer,
    CapturaFlujoSerializer,
    CapturaEstadisticaSerializer,
    CapturaAccionActivaSerializer,
    FingerprintObservacionSerializer,
    TrabajoScannerSerializer,
    PuertoEncontradoSerializer,
    PuertoResumenSerializer,
    HeuristicaEventoSerializer,
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
                acciones_count=Count("acciones_activas", distinct=True),
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

    @action(detail=True, methods=["get"], url_path="acciones")
    def acciones(self, request, pk=None):
        sesion = self.get_object()
        acciones = sesion.acciones_activas.order_by("-ejecutada_en")
        acciones = self._limit_queryset(acciones, request, default=20, max_items=100)
        serializer = CapturaAccionActivaSerializer(acciones, many=True)
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

        active_params = None
        if modo in {"activa", "mixta"}:
            objetivo = (request.data.get("objetivo") or "").strip()
            if not objetivo:
                return Response(
                    {"detail": "Debés indicar un objetivo para la captura activa."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            puertos_raw = request.data.get("puertos") or request.data.get("puerto") or "80"
            try:
                puertos = self._parse_ports(puertos_raw)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

            tipo_accion = request.data.get("tipo_accion") or "tcp_syn"
            if tipo_accion not in dict(CapturaAccionActiva.TIPO_CHOICES):
                return Response({"detail": "Tipo de acción activa inválido."}, status=status.HTTP_400_BAD_REQUEST)

            payload = request.data.get("payload") or ""
            try:
                timeout_value = request.data.get("timeout")
                timeout = float(timeout_value) if timeout_value else 3.0
            except (ValueError, TypeError):
                return Response({"detail": "El timeout debe ser un número válido."}, status=status.HTTP_400_BAD_REQUEST)

            active_params = {
                "objetivo": objetivo,
                "puertos": puertos,
                "tipo": tipo_accion,
                "payload": payload,
                "timeout": max(timeout, 0.5),
            }

        sesion = create_capture_session(
            interfaz=interfaz,
            modo=modo,
            origen=origen,
            filtro_bpf=filtro_bpf,
            duracion_objetivo=duracion_value,
            owner=request.user,
        )

        if modo in {"pasiva", "mixta"}:
            self._launch_passive_capture(
                sesion,
                ventana_segundos=ventana_segundos,
                duracion=duracion_value,
                filtro=filtro_bpf,
                interfaz=interfaz,
            )
        if modo in {"activa", "mixta"} and active_params:
            self._launch_active_capture(
                sesion,
                finalize=modo != "mixta",
                **active_params,
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

    def _launch_active_capture(
        self,
        sesion: CapturaSesion,
        *,
        objetivo: str,
        puertos: list[int],
        tipo: str,
        payload: str,
        timeout: float,
        finalize: bool = True,
    ) -> None:
        def _run():
            close_old_connections()
            try:
                if sesion.estado == "pendiente":
                    sesion.estado = "capturando"
                    sesion.inicio = timezone.now()
                    sesion.save(update_fields=["estado", "inicio"])
                for puerto in puertos:
                    run_active_probe(
                        sesion,
                        tipo=tipo,
                        objetivo=objetivo,
                        puerto=puerto,
                        payload=payload,
                        timeout=timeout,
                    )
                increment_session_counters(sesion, paquetes=len(puertos), bytes_totales=0)
                if finalize:
                    mark_session_state(sesion, estado="completada", fin=timezone.now())
            except Exception as exc:
                mark_session_state(
                    sesion,
                    estado="error",
                    observaciones=f"Error en captura activa: {exc}",
                    fin=timezone.now(),
                )
            finally:
                close_old_connections()

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()

    def _parse_ports(self, value) -> list[int]:
        if value is None:
            return [80]
        if isinstance(value, (list, tuple)):
            source = value
        else:
            source = str(value).split(",")
        ports: list[int] = []
        for item in source:
            chunk = str(item).strip()
            if not chunk:
                continue
            try:
                port = int(chunk)
            except ValueError:
                raise ValueError("Los puertos deben ser números enteros separados por coma.")
            if not (0 < port <= 65535):
                raise ValueError("Los puertos deben estar entre 1 y 65535.")
            ports.append(port)
        return ports or [80]


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
        return TrabajoScanner.objects.filter(
            Q(owner=user) | Q(owner__isnull=True)
        ).order_by('-inicio')[:50]


class PuertoEncontradoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PuertoEncontradoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            PuertoEncontrado.objects.select_related('trabajo')
            .filter(
                Q(trabajo__owner=user)
                | Q(trabajo__owner__isnull=True)
                | Q(dispositivo__owner=user)
            )
            .order_by('-detected_at')[:200]
        )


class PuertoResumenViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PuertoResumenSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return PuertoResumen.objects.select_related('dispositivo').filter(
            Q(dispositivo__owner=user)
        )


class HeuristicaEventoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HeuristicaEventoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            HeuristicaEvento.objects.select_related('dispositivo', 'regla')
            .filter(
                Q(owner=user)
                | Q(dispositivo__owner=user)
                | Q(analisis__owner=user)
                | Q(captura_sesion__owner=user)
            )
            .order_by('-ts')[:200]
        )


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
        user = request.user
        queryset = HostDetectado.objects.select_related("analisis").filter(
            Q(analisis__owner=user) | Q(analisis__owner__isnull=True)
        )
        if analisis_id:
            queryset = queryset.filter(analisis_id=analisis_id)

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
            )
        except DetectorRunError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AnalisisRedSerializer(analisis)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
