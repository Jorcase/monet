from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


class CsrfTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({"csrfToken": get_token(request)})


class SessionView(APIView):
    def get(self, request, *args, **kwargs):
        return Response({"user": UserSerializer(request.user).data})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        return Response(
            {"detail": "Autenticación exitosa.", "user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    def post(self, request, *args, **kwargs):
        logout(request)
        return Response({"detail": "Sesión finalizada."})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(
            {"detail": "Registro exitoso.", "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
