from django.db.models import Q
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from detector.models import Dispositivo
from captura.models import CapturaSesion
from escaner.models import TrabajoScanner, PuertoEncontrado, PuertoResumen
from analitica.models import HeuristicaEvento
from api.serializers import (
    DispositivoSerializer,
    CapturaSesionSerializer,
    TrabajoScannerSerializer,
    PuertoEncontradoSerializer,
    PuertoResumenSerializer,
    HeuristicaEventoSerializer,
)


class DispositivoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DispositivoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Dispositivo.objects.order_by('-ultima_vez')
        return qs.filter(Q(owner=user) | Q(owner__isnull=True))


class CapturaSesionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CapturaSesionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            CapturaSesion.objects.prefetch_related('flujos')
            .filter(Q(owner=user) | Q(owner__isnull=True))
            .order_by('-inicio')
        )


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
