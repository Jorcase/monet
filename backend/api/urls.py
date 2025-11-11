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
)

router = DefaultRouter()
router.register(r'dispositivos', DispositivoViewSet, basename='dispositivo')
router.register(r'capturas', CapturaSesionViewSet, basename='captura')
router.register(r'trabajos', TrabajoScannerViewSet, basename='trabajo')
router.register(r'puertos', PuertoEncontradoViewSet, basename='puerto')
router.register(r'puertos-resumen', PuertoResumenViewSet, basename='puerto-resumen')
router.register(r'alertas', HeuristicaEventoViewSet, basename='alerta')

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", SessionView.as_view(), name="auth-me"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
] + router.urls
