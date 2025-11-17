from django.urls import path
from rest_framework.routers import DefaultRouter

from api.auth_views import (
    CsrfTokenView,
    LoginView,
    LogoutView,
    RegisterView,
    SessionView,
)
from api.views import (
    DispositivoViewSet,
    CapturaSesionViewSet,
    TrabajoScannerViewSet,
    PuertoEncontradoViewSet,
    PuertoResumenViewSet,
    HeuristicaEventoViewSet,
    HeuristicaReglaViewSet,
    AgenteStatusView,
    AgenteRefreshView,
    AgenteHistoryView,
    AnalisisRedListView,
    HostDetectadoListView,
    DispositivoHistorialView,
    DetectorScanView,
    ScannerRunView,
    CapturaRunView,
    CapturaFinalizarView,
    HeuristicaEventoNotificadoView,
    DominioCategoriaViewSet,
)

router = DefaultRouter()
router.register(r"dispositivos", DispositivoViewSet, basename="dispositivo")
router.register(r"capturas", CapturaSesionViewSet, basename="captura")
router.register(r"trabajos", TrabajoScannerViewSet, basename="trabajo")
router.register(r"puertos", PuertoEncontradoViewSet, basename="puerto")
router.register(r"puertos-resumen", PuertoResumenViewSet, basename="puerto-resumen")
router.register(r"alertas", HeuristicaEventoViewSet, basename="alerta")
router.register(r"reglas", HeuristicaReglaViewSet, basename="regla")
router.register(r"dominios", DominioCategoriaViewSet, basename="dominio-categoria")

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", SessionView.as_view(), name="auth-me"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("agente/estado/", AgenteStatusView.as_view(), name="agente-estado"),
    path("agente/refresh/", AgenteRefreshView.as_view(), name="agente-refresh"),
    path("agente/historial/", AgenteHistoryView.as_view(), name="agente-historial"),
    path("detector/analisis/", AnalisisRedListView.as_view(), name="detector-analisis"),
    path("detector/hosts/", HostDetectadoListView.as_view(), name="detector-hosts"),
    path(
        "detector/dispositivos/<int:dispositivo_id>/historial/",
        DispositivoHistorialView.as_view(),
        name="detector-dispositivo-historial",
    ),
    path("detector/ejecutar/", DetectorScanView.as_view(), name="detector-ejecutar"),
    path("escaner/ejecutar/", ScannerRunView.as_view(), name="escaner-ejecutar"),
    path("capturas/ejecutar/", CapturaRunView.as_view(), name="capturas-ejecutar"),
    path(
        "capturas/<int:pk>/finalizar/",
        CapturaFinalizarView.as_view(),
        name="capturas-finalizar",
    ),
    path(
        "alertas/<int:pk>/notificado/",
        HeuristicaEventoNotificadoView.as_view(),
        name="alerta-notificado",
    ),
] + router.urls
