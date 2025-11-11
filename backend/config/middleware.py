from __future__ import annotations

from django.conf import settings
from django.http import HttpResponse


class SimpleCorsMiddleware:
    """
    Middleware liviano para habilitar CORS con credenciales hacia los orígenes configurados.

    Se usa en lugar de `django-cors-headers` para evitar dependencias externas.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = set(settings.CORS_ALLOWED_ORIGINS or [])

    def __call__(self, request):
        origin = request.headers.get("Origin")
        allow_origin = origin if origin in self.allowed_origins else None

        if request.method == "OPTIONS" and allow_origin:
            response = HttpResponse(status=200)
        else:
            response = self.get_response(request)

        if allow_origin:
            response["Access-Control-Allow-Origin"] = allow_origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response[
                "Access-Control-Allow-Headers"
            ] = "Authorization, Content-Type, X-CSRFToken, X-Requested-With"
            vary = response.get("Vary")
            response["Vary"] = "Origin" if not vary else f"{vary}, Origin"

        return response
