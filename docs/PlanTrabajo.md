# Plan de Trabajo Monet

Hoja de ruta viva para coordinar las siguientes prioridades. Autenticación, inventario, captura pasiva, escáner, alertas y navegación ya están operativos; enfocamos lo que falta.

## 1. Pendientes inmediatos
- Documentar en README/Informe las variables de entorno y bootstrap de usuario (`MONET_DEFAULT_OWNER`, `MONET_FRONTEND_ORIGIN`, flags `--owner`) y añadir `.env.example` para front/back.  
- Tests básicos (pytest o `manage.py test`): login/logout, filtros por owner, creación y lectura de datos con owner, CSRF.  
- Script/management command de bootstrap: crear usuario inicial, setear defaults y datos mínimos para pruebas.

## 2. Backend – Siguientes pasos
- Roles/permisos por nivel (`admin`, `operador`, `lectura`) y ajuste de viewsets/commands para respetarlos; migración para asignar rol inicial.  
- Tokens/agentes dedicados y multi-organización (Organization + Membership) para compartir datos entre usuarios.  
- Retención de flujos de captura: política de purga/exportación (PCAP) + command/cron documentado.  
- Fingerprint activo: migrar a `python-nmap` para parsing estructurado; mantener heurísticas pasivas y preparar opción de OS detection unificada.  
- Captura pasiva enriquecida: extraer metadata L7 (SNI/host HTTP, protocolos conocidos) y generar reglas/eventos basados en esa info.

## 3. Frontend – Siguientes pasos
- Estados vacíos/errores (403/404) en páginas de módulos y loaders consistentes.  
- Limpieza y refactor por features (`features/detector`, `features/captura`, etc.) separando componentes/table helpers.  
- Exportaciones PDF/CSV pendientes: dejar botones listos con wiring de servicio cuando se implemente en backend.  
- Ajustar vistas de captura para mostrar metadata L7 cuando esté disponible y gráficas resumidas (top dominios/puertos).
- Wizard/selector de plantillas de reglas en UI de alertas (rellenar `parametros` sin JSON manual).

## 4. Próximo backlog (cloud y despliegue)
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
- Pendientes: migrar a Postgres antes de producción, script de bootstrap (usuario admin + `.env`), diseñar tokens de agentes.
- Futuro: modo PCAP forense opcional con rotación/retención y descarga; desactivado por defecto para no crecer disco.

## 5. Plan para agente local + control en nube (producción)
- Separar capas lógicas: mantener services puros; la API DRF como capa delgada que solo orquesta.
- Definir el canal agente↔nube: REST/gRPC/MQTT con TLS y auth mutua (token/cert por agente); registro de agente.
- Roles de despliegue:
  - Agente local: proceso que recibe comandos (escaneo, captura) y ejecuta services; permite permisos de red (`CAP_NET_RAW/NET_ADMIN`).
  - Control plane (nube): API/BD central + front. Recibe órdenes del usuario, las envía al agente, recibe resultados y los persiste.
- Sincronización y payloads: diseñar mensajes compactos para hosts/puertos/flujos; colas y reintentos; decidir qué se guarda local vs. nube.
- Seguridad: TLS, autenticación de agentes, control de acceso por usuario/org; sandbox de comandos del agente.
- Migración progresiva: primero reusar los mismos services en un “agent service” local; luego mover la API/BD al VPS y apuntar el front al dominio público.

---
