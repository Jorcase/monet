# Plan de Trabajo Monet

Hoja de ruta viva para coordinar las tareas inmediatas del backend y frontend. El objetivo actual es habilitar un flujo completo de autenticación y garantizar que cada usuario sólo vea la información que le corresponde.

## 1. Backend – Autenticación y multiusuario
- **Autenticación lista** ✅  
  - Endpoints `/api/auth/csrf|login|logout|me|register` ya devuelven JSON y usan sesiones de Django.  
  - Middleware CORS + configuración de cookies (`MONET_FRONTEND_ORIGIN`, `MONET_SESSION_COOKIE`, etc.) habilitada.
- **Datos asociados a usuarios** ✅  
  - Modelos principales tienen `owner` y los viewsets filtran por `request.user`.  
  - Comandos (`detectar_hosts`, `capturar_*`, `escanea_puertos`, `evaluar_heuristicas`) aceptan `--owner` y usan `resolve_owner`.
- **Pendiente inmediato**  
  - Documentar en README/Informe las nuevas variables (`MONET_DEFAULT_OWNER`, `MONET_FRONTEND_ORIGIN`, flags `--owner`).  
  - Agregar tests básicos (pytest o `manage.py test`) para validar: login/logout, filtros por usuario, creación de datos con owner.  
  - Automatizar algún script de “bootstrap” que cree el primer usuario y cargue configuraciones mínimas.

## 2. Frontend – Sesiones y rutas protegidas
- **Contexto de autenticación**  
  - Crear `AuthContext`/`useAuth` que almacene `user`, `isAuthenticated`, `loading`, `login`, `logout`, `register`, `refresh`.  
  - Al montar la app, llamar `auth.refresh()` (GET `/auth/me`) para hidratar el estado si existe cookie de sesión.  
  - Guardar y reutilizar el token CSRF en cada request `POST/PUT/PATCH/DELETE`.
- **Cliente HTTP** (`src/services/apiClient.ts`)  
  - Enviar siempre `credentials: "include"` y cabecera `X-CSRFToken` cuando aplique.  
  - Centralizar manejo de errores 401 para forzar `logout()` automático.
- **Protección de rutas**  
  - Crear componente `ProtectedRoute` que muestre spinner mientras valida, redirija a `/login` si el usuario no está autenticado y, en caso contrario, renderice `<Outlet />`.  
  - Usar `ProtectedRoute` para envolver `MainShell` en `App.tsx`.  
  - Si el usuario visita `/login` o `/signup` estando autenticado, redirigir automáticamente a `/dashboard`.
- **Forms de login/signup**  
  - Conectar `LoginForm` y `SignupForm` con el contexto: manejar validaciones, estados de carga, mensajes de error y redirecciones (`from` del router).  
  - Añadir enlaces “¿Olvidaste tu contraseña?” cuando tengamos endpoint o, mientras tanto, deshabilitarlo.

## 3. Servicios por módulo y consumo de API
- Definir un archivo por recurso (`services/devices.ts`, `services/captures.ts`, etc.) que utilice `apiClient`.  
- Crear hooks de datos (`useDevices`, `useCaptures`) con caching simple o TanStack Query si lo necesitamos.  
- Reemplazar los `PlaceholderPage` gradualmente con las vistas reales:  
  - Dashboard: totales resumidos, últimos eventos y últimas capturas.  
  - Dispositivos/Hosts: tablas paginadas filtradas por usuario.  
  - Capturas, Escáner, Alertas: listar registros y permitir acciones básicas (ver detalles, exportar).  
- Diseñar `.env.example` completo para el frontend (`VITE_API_BASE_URL`, banderas de mock, etc.) y documentar cómo levantar ambos servicios juntos.

## 4. UX y organización del frontend
- Completar navegación: collapsible del sidebar para “Información” y nuevas secciones.  
- Definir componentes compartidos (cards, tablas, loaders) y documentar convenciones (nomenclatura, rutas, estructura de carpetas).  
- Preparar vistas vacías para estados sin datos y errores comunes (403/404).

## 5. Pruebas y documentación
- Anotar en `docs/Informe.md` y `README` los pasos para inicializar la base de datos, crear el primer usuario y levantar el frontend protegido.  
- Crear una sección “Flujo de sesión” con diagrama simple (front ↔ API ↔ Django session).  
- Preparar baterías mínimas de pruebas manuales:  
  1. Registro → login → acceso a dashboard.  
  2. Logout → redirección al login.  
  3. Intento de acceder a `/dashboard` sin sesión → redirección.  
  4. Verificación de que cuentas distintas no comparten dispositivos/analíticas.

## 6. Próximo backlog (después de auth)
- Multi-organización (grupos de trabajo compartiendo datos).  
  - Modelos `Organization`, `Membership`, invitaciones.  
  - Compartir recursos sólo entre miembros.  
- Refactor de reportes/alertas para usar los nuevos propietarios de datos.  
- Integración con despliegue en la nube (API central + agentes locales sincronizando).

---


