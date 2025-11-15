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
- Roles/permisos (prioridad media, antes del despliegue cloud):
  - Definir niveles (`admin`, `operador`, `lectura`) y su alcance en API/frontend.
  - Ajustar vistas y comandos para respetar permisos (ej. quién ejecuta capturas o borra dispositivos).
  - Preparar migración para asignar rol inicial a usuarios existentes y documentar cómo cambiarlos.
- Historiales largos (Detector/Agente):
  - Implementar paginación/cursor para `analisis`, `hosts` y `agente/historial` (cargar primeros 20 y traer más al scrollear o con botón “ver más”).
  - Documentar parámetros (`limit`, `page`, etc.) para que el front pueda recuperar todo el historial cuando crezca.
- Refactors cuando las vistas queden completas:
  - Extraer subcomponentes (tablas, resúmenes, formularios) a `src/features/**/components` para que los archivos de página no concentren toda la UI.
  - Reorganizar carpetas por “feature” (ej. `features/detector`, `features/agente`) y mover hooks/servicios asociados allí.
  - Documentar la convención y aplicar la limpieza cuando cada módulo tenga la funcionalidad base estable.
- Retención de flujos de captura:
  - Definir política para purgar/archivar `captura_flujo` (por edad o exportación a PCAP) y evitar que la BD crezca indefinidamente.
  - Automatizar cleanup (management command + cron) y documentar el procedimiento.
- Detalle de capturas activas:
  - Separar vistas y métricas específicas para sesiones activas (acciones, latencias, objetivos) y definir qué estadísticas adicionales tienen sentido.
  - Evaluar integración con módulo de Escáner para evitar duplicación de funcionalidad.
- Captura pasiva – mayor riqueza de datos:
  - Extender el sniffer para extraer metadata de capa 7 (SNI/Host de TLS/HTTP, nombres de servicio conocidos) y guardarla junto al flujo.
  - Construir reglas heurísticas basadas en esa metadata (dominios permitidos, detección de protocolos inusuales) y mostrarlas en el panel de alertas.
  - Agregar visualizaciones en la UI de capturas: “Top dominios”, “Top pares IP:puerto”, raspado de protocolos y posibles firmas de aplicaciones.
- Fingerprints activos/pasivos:
  - Reemplazar el `subprocess` de Nmap por la librería `python-nmap` para obtener parsing estructurado y métricas más ricas.
  - Agregar un modo ARP “completo” (enviar múltiples solicitudes con reintentos/intervalos configurables) para mejorar la detección de hosts intermitentes.

### Notas para despliegue nube (referencia futura)
- Backend/API:
  - VPS (DO 1 vCPU/1GB) con Python 3.12, nginx, Gunicorn y, de ser posible, PostgreSQL.  
  - Variables esenciales: `SECRET_KEY`, `ALLOWED_HOSTS`, `MONET_FRONTEND_ORIGIN`, `MONET_DEFAULT_OWNER`, nombres de cookies (`MONET_SESSION_COOKIE`, etc.).  
  - Reverse proxy nginx + HTTPS (Let’s Encrypt) sirviendo `/api/` y `/admin/`.  
  - Gunicorn apuntando a `backend.config.wsgi`.
- Frontend:
  - Build con `VITE_API_BASE_URL` apuntando al dominio público del backend.  
  - Host estático (Netlify/Vercel) o el mismo nginx (`frontend/dist`).  
  - Asegurar `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` coincidan con el dominio final.
- Agentes locales:
  - Cada instalación exporta `MONET_DEFAULT_OWNER` (o usa `--owner`) para asociar datos.  
  - Requiere usuario creado en la API (idealmente credenciales por agente/token a futuro).
- Pendientes: script de bootstrap (crear usuario admin + `.env`), migrar a Postgres antes de producción, diseñar tokens específicos para agentes en lugar de reutilizar el superusuario.

---
