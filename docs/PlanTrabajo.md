# Plan de Trabajo Monet

Documento de referencia para organizar las tareas pendientes del proyecto. Las actividades se agrupan en etapas y cada una incluye subtareas concretas que pueden convertirse en issues o checklist individuales.

## 1. Backend Local – Robustecer módulos existentes
- **Alertas de cambios de puertos**
  - Crear modelo `AlertaPuerto` con campos: puerto, host/dispositivo asociado, estado anterior/nuevo, timestamp y nivel de severidad.
  - Extender `persist_scan_results` para disparar alertas cuando un puerto cambie de abierto ↔ cerrado o aparezca/desaparezca.
  - Registrar el evento en base de datos y preparar hook para notificaciones (email/log).
  - Añadir vista en Django admin y en interfaz web para revisar historial de alertas.
- **Automatización con cron/management commands**
  - Unificar lógica de escaneo en comando `detectar_hosts`.
  - Crear comando `escanear_puertos` que acepte parámetros (IP única, red completa, perfiles rápido/exhaustivo).
  - Registrar cada ejecución en un modelo `TareaProgramadaLog`.
  - Documentar cómo configurar `cron` del sistema o paquete (`django-crontab`, `celery beat`) para ejecutarlos.
  - Agregar opción en interfaz para lanzar manualmente las tareas programadas.
- **Mejoras en módulo detector/escáner**
  - Asegurar mapeo MAC → IP → hostname en vistas y modelos.
  - Permitir CRUD básico para renombrar dispositivos, añadir notas y marcar como “aprobado/desconocido”.
  - Revisar paginación/listado para mostrar todos los dispositivos activos en selector.

## 2. Módulo de captura y enriquecimiento
- **Captura pasiva de tráfico**
  - Diseñar modelos `CapturaSesion` y `CapturaPaquete` (o resumen agregado) con filtros por interfaz, protocolo, timestamps y tamaño.
  - Implementar servicio con Scapy `sniff` filtrando protocolos clave (ARP, DNS, HTTP, TLS handshakes, etc.).
  - Guardar metadatos relevantes (IP origen/destino, puertos, MAC, protocolo, tamaño, timestamp).
  - Opcional: almacenar `.pcap` limitado por tamaño/rotación configurable.
  - Integrar con persistencia de dispositivos (enriquecer hostname, vendor, servicios detectados).
- **Captura activa / fingerprinting**
  - Implementar técnicas de fingerprinting pasivo (TTL, opciones TCP) y activo (banners, paquetes específicos).
  - Definir heurísticas para detectar sistema operativo aproximado, servicios comunes y anomalías.
  - Documentar limitaciones y requisitos de permisos.
- **Heurísticas y signatures**
  - Elaborar reglas simples (ej. detección de conexiones a IP sospechosa, protocolos no habituales).
  - Preparar mecanismo para “firma” básica (por ejemplo, alerta si se detecta tráfico HTTP con cabecera específica).
  - Registrar resultados en tabla `HeuristicaEvento` con severidad y acción recomendada.

## 3. Reportes y notificaciones
- **Reportes PDF / CSV**
  - Diseñar plantillas HTML para reportes de red (resumen de dispositivos, puertos, alertas y capturas).
  - Generar PDF usando librería (`WeasyPrint`, `xhtml2pdf` o similar) y guardar histórico en base.
  - Ofrecer exportación CSV/JSON para análisis externo.
  - Añadir opción para descargar desde la interfaz web.
- **Envío periódico por correo**
  - Configurar servicio de email (usar `django.core.mail` o integración con proveedor SMTP).
  - Implementar job programado que envíe reportes diarios/semanales a administradores del agente.
  - Permitir configurar frecuencia y destinatarios en la interfaz.
- **Notificaciones en tiempo real**
  - Preparar pipeline para alertas inmediatas (email, futuros canales como push).
  - Registrar cuáles alertas ya fueron notificadas para evitar duplicados.

## 4. Autenticación, roles y seguridad
- **Login y protección de vistas**
  - Activar Django auth estándar con formulario de login.
  - Configurar grupos: `Administrador` (total), `Operador` (ejecuta funciones, sin eliminar), `Observador` (solo lectura).
  - Proteger vistas críticas (ejecución de escaneos, descarga de reportes) con permisos adecuados.
- **Gestión de usuarios**
  - Crear vistas o comandos para registrar agentes/usuarios iniciales.
  - Registrar bitácora de acciones administrativas (quién ejecutó qué tarea).
- **Bloqueo/aislamiento de dispositivos (PoC)**
  - Analizar factibilidad de enviar aviso a router/switch (ARP spoof controlado u otra técnica).
  - Documentar riesgos y dejarlo como funcionalidad experimental opcional.

## 5. Base de datos y API
- **Migración a PostgreSQL**
  - Preparar configuración con variables en `.env`.
  - Generar script/documentación para migrar datos desde SQLite (dump/export/import).
  - Ajustar `migrations` y probar en entorno local/VM.
- **API REST y sincronización**
  - Introducir Django REST Framework para exponer endpoints de dispositivos, puertos, alertas y reportes.
  - Autenticar mediante tokens (TokenAuth o JWT) asociados a cada agente.
  - Diseñar flujo de sincronización “cloud save”: agente local sube resultados, servidor central almacena por cuenta/usuario.
  - Documentar cómo un backend local se registra frente al servidor central y cómo envía resultados diferidos.
- **Integración nube**
  - Planificar despliegue de API y BD en proveedor cloud (ej. Render, Railway, Heroku, VPS).
  - Definir estrategia para que la web en la nube muestre datos sincronizados y permita disparar tareas si el agente está activo.

## 6. Frontend y experiencia de usuario
- **Reescritura con React + Tailwind**
  - Crear proyecto `frontend/` con Vite/CRA.
  - Implementar pantallas: dashboard, dispositivos, puertos, capturas, reportes, alertas.
  - Consumir API REST; manejar autenticación (JWT, refresh tokens).
  - Diseñar componentes reutilizables y responsive.
- **Visualizaciones (Chart.js / Recharts)**
  - Gráfico de evolución de dispositivos y puertos abiertos cerrados.
  - Top servicios detectados, alertas por severidad, tendencias de tráfico capturado.
- **Integración con backend**
  - Configurar CORS, CSRF (si aplica) y endpoints de sesión.
  - Documentar proceso de build y despliegue (bundle estático servido por Django o setup separado).

## 7. Extras e investigación futura
- **Gestión avanzada de heurísticas**
  - Diseñar editor de reglas simple (ej. YAML/JSON) que permita agregar nuevas detecciones sin tocar código.
  - Registrar resultados con explicación para auditorías.
- **Soporte para múltiples protocolos**
  - Extender escáner para UDP, ICMP y detección de servicios específicos (DNS, DHCP, SMB).
- **Documentación y casos de uso**
  - Actualizar `docs/` con manual de instalación y operación, diagramas de arquitectura y flujos de datos.
  - Preparar narrativa de valor (qué diferencia al sistema de una app móvil básica).
- **Plan de despliegue final**
  - Checklist para montar VM + API + frontend.
  - Estrategia de demo: escenarios de captura, alerta, reporte y sincronización.

## Seguimiento sugerido
- Utilizar este listado como backlog.
- Priorizar tareas de la sección 1 y 2 para robustecer el backend local.
- Luego abordar reportes/notificaciones y autenticación.
- Finalmente avanzar hacia migración a Postgres, API/React y funcionalidades avanzadas.
