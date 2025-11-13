[App móvil / App web]  <--->  [API REST en la nube]  <--->  [Backend local (VM o localmente con comandos(preferentemente mas facil))]
                                       |
                                 [Base de datos PostgreSQL]
Informe
Maquina Virtual: Ubuntu 24.04 LTS,
Configuracion escencial: Bridged Adapter, Promiscuous Mode: Allow All
User: monet 
Pass: ubuntu
Ver interfaz: ifconfig o ip a (ej enp6s0)

# activar venv - source .venv/bin/activate SOLO PARA PC LOCAL
# VM no utiliza venv, instala todo globalmente con
# sudo python3 -m pip install --break-system-packages -r requirements.txt

# pasos: 
1. clonar el repo
2. crear o activar el venv
3. instalar requirements
4. ejecutar: sudo -E "$(pwd)/.venv/bin/python" backend/manage.py runserver 
"PENDIENTE COMPLETAR"

Instalaciones:
	Paquetes de sistema: tcpdump, nmap, libpcap-dev, python3, pip3, git
	Paquetes Python(Instalados globalmente con --break-system-packages): scapy, python-nmap, pycryptodome, reportlab, psycopg2-binary, django, djangorestframework
	
Configuraciones:
# Postgres: por ahora en mi maquina local, configure el pg_hba.conf y cree un 
# user:jorcas pass:seminariored namebd:monetdb
se utilizara sqlite de django por defecto para el desarrollo de la version 1.0, luego se migrara a postgres o mysql

# Anotaciones 11102025:
Probe en pruebascapy.py para ver si funcionaba al igual con nmap con un archivo pruebanmap.py

# Anotaciones 12102025:
Termine de definir la funcionalidad de la primera version del backend local junto a las posibles tablas para guardar informacion en la base de datos.
Preparando el entorno para empezar a trabajar en el desarrollo

# Anotaciones 19102025 - primer modulo
En backend settings agregamos la app
Creado el modulo agente y migrado
Agregado psutil a requirements, uso de libreria de sockets y ipaddress en network_info.py
Carpeta services, archivo network_info que obtiene la informacion de la maquina ejecutante
Carpeta management/commands/refresh_agente.py automatizacion del guardado de datos con un management command, permite correr python manage.py refresh_agente para update or create del agente local
Agregamos views.py
Creamos templates html y css para ver el modulo
Cambiamos en settings el time_zone
Pruebas correctas con diferentes interfaces, se probo que no permita la interfaz lo
Pruebas en la vm y tambien funciona correctamente, se pulleo los cambios, se instalaron los requerimientos, se migro y se probo.

# Anotaciones 20102025 - segundo modulo
Creacion del models para el modulo detector
Agregar en settings la app
Agregue scapy en requirements
Creacion de network_range.py en services, sirve para saber que rango debe barrer el escaner
Para probarlo:    python manage.py shell 
                  → from detector.services.network_range import get_local_network 
                  → get_local_network()
Creacion de arp_scan.py
Para ejecutarlo en la vm debo utilizar sudo por los privilegios
La latencia es una latencia aproximada, proximas versiones deberiamos mejorar con las posibilidades que proporciona scapy .time y eso implica guardar medir cada paquete por separado modificando la logica de este archivo
Creacion de persistence.py un helper que ayuda a automatizar y desglosar la informacion en sus respectivas tablas
Creacion de command 
python manage.py detectar_hosts
Permite ejecutar toda la logica del modulo, podria servir para automatizar analisis diarios

# Anotaciones 21102025 - segundo modulo
Creacion de vistas, html y css para probar el modulo
Pusheado y pulleado en la vm para iniciar pruebas
Para actualizar en la vm --IMPORTANTE--:
# sudo python3 -m pip install --break-system-packages -r requirements.txt
de ahi se puede correr normalmente y probar
Notas de las pruebas: 
      algunos dispositivos como celulares si no estan en uso no son detectados pero si estan siendo utilizados si, un dispositivo al conectarse a una red wifi por defecto utiliza mac aleatoria, para cambiar eso debe configurarse el dispositivo

# Anotaciones 261025 - segundo modulo
cambio en el modelo de detector en dispositivo para poder registrar bien los dispositivos
problema: dispositivos conectados por wifi por defecto tienen mac aleatoria lo que hace ineficiente el guardado de datos en dispositivos
solucion: intentar obtener el hostname en todos los dispositivos y detectar cuando la mac es aleatoria para que a la hora de guardar en dispositivo, sea por el hostname si esque se encuentra sino por ip de ultimo caso y marcar como dispositivo temporal.
actualizacion para detectar latencia con cada dispositivo, luego la general del analisis, mejora para intentar detectar el hostname de los dispositivos, mejora para el campo de estado de los dispositivos, mejora en las vistas para poder debuggear bien todas las pruebas, ya se reconocen los dispositivos si esque tienen mac constante o aleatoria y se actualiza si esque son temporarios o no.

# Anotaciones 271025 - segundo modulo
Dependencia opcional en la VM - IMPORTANTE - sudo apt install samba-common-bin - Para nmblookup
Creacion en services, hostname.py para poder intentar detectar el hostname en la deteccion de dispositivos en la red local, utilizando dns inverso con libreria de sockets, luego con netBIOS(nmblookup) NBNS, funciona como fallback pero poco eficiente ya que los dispositivos actuales no trabajan con eso o lo tienen desactivado por defecto al igual que los rooters, la obtencion de hostname se intentara resolver mas adelante en el modulo de captura_pasiva
Se agrego en models de dispostivo el campo vendor, capaz de detectar con los primeros 3 bytes de la mac el fabricante de cada dispositivo, se creo un helper que utiliza netaddr para resolverlo, ahora en teoria se podria agregar como informacion a cada dispositvo.
vistas creadas para primera presentacion del backend local generadas con ia para ahorrar tiempo por el momento utilizando solamente html y css
# Anotaciones 301025 - segundo modulo
Cambio en la logica de registro de mac aleatoria para registrar dispositivos, la mac aleatoria solo cambia si se borra la red y se vuelve a registrar ahi genera otra mac aleatoria, mientras sigue siendo constante asique tiene logica seguir actualizando el mismo dispositivo con la mac aleatoria por mas de que sea aleatoria.
vistas y front para el modulo de detector, y tablas relacionadas al mismo, historial, dispositivos y el modulo en si.
# version 2 de modulo detector, escaner rapido y escaner exhaustivo
existe una herrapienta llamada arp-scan que hace lo mismo que este modulo
# Anotaciones 311025 - tercer modulo (escaneo)
Planeamiento del modulo de escaneo de puertos
Creacion de models, services: port_scan y persistence, scanner, sirven para ejecutar el escaneo dependiendo las opciones propuestas para la primera version, tanto como para una ip, un grupo de ips, dispostivios activos con respecto a analisis recientes
Creacion del command para manejar con el manage.py
# Anotaciones 011125 - tercer modulo
creacion de las vistas y mejora en funcionalidades para el tratado de datos obtenidos en el escaneo, el modulo puede escanear ips que el usuario elija(pueden ser varias), puede elegir dispositivos activos(MEJORA PENDIENTE DE QUE SE CONSIDERA ACTIVO EN DISPOSITIVOS), o elegir analisis recientes que tienen las ips mas recientes(lo mismo que en dispositivos)
hay varios tipos de escaneo, por ahora 3 pero estoy agregando la funcionalidad de poder elegir comandos a eleccion
mejora visual de que puerto es de que ip

# Anotaciones 031125 - tercer modulo
se ajusto el guardado de puertos, se creo una tabla para llevar registro y evitar duplicaciones cuando un puerto esta enlazado a un dispositivo en especifico, similar a historial_dispositivos
ahora se supone que guarda algunos puertos cerrados y todos los filtrados
mejora visual para mirar la informacion recolectada por los modulos
mejora en el nav bar
mejora completa para --- PRIMERA PRESENTACION ---

# Anotaciones 041125 - rediseño del proyecto

fuertes:
agente de monitoreo de redes domesticas avanzadas / pymes
que identifica dispositivos, vigila puertos expuestos y captura tráfico para generar reportes forenses y de seguridad
herramienta gratuita y flexible a cualquier sistema operativo al utilizar una vm
acceso a informacion real de la red
sistema audita, registra histórico, automatiza alertas y permite gestión centralizada
# Anotaciones 051125 - rediseño del proyecto
aplicaciones similares de guia: advanced-ip-scanner
mejoras: 
1. alerta de cuando se detecta que se abre o cierra un puerto y registrarlo
2. automatizar tareas con los cron(pendiente definir bien)
3. generacion de reportes periodicos para audiotrias internas con posibilidad de descargarlos en formato pdf y si son diarios o periodicamente que se puedan enviar por correo al administrador del agente

4. captura puntual, constante, programada, envio de paquetes a diferentes puertos para controlar el trafico de diferentes protocolos

5. heuristicas claramente tener en cuenta a la hora de hacer el modulo de captura

6. fingerprinting pasivo y activo, creo que scapy tambien tiene una manera de hacer esto o no, digo como considerarlo como opcion

7. signature simple (pendiente a definir bien si se hace)
8. almacenamiento mas .pcap mm para que serviria tener un pcap en vez de guardar en formato de texto los datos relevantes, duda pendiente

9. notificaciones en cambios seguramente correo para la version web, cuando hagamos la movil sera correo y push

10. opciones de hacer analisis rapido, exhaustivo y bueno, se podria hacer que desde la version que yo entro a la web en la nube haga un analisis icmp y si esque tengo acceso a la vm local ahi sea mucho mas informativo porque ya podriamos utilizar arp y acceso a la red mas real.

11. autenticacion de usuarios vistas protegidas, 3 tipos de usuarios, el que puede hacer todo desdes cualquier lugar y puede acceder a todo lo relacionado a su cuenta, el que puede ejecutar y ver cosas pero no puede eliminar y solo modificar nombres, y otro usuario comuin que pueda visualizar y ejecutar funciones basicas(en la web en la nube algo asi como una app movil que detecta dispostivios con icmp o detecta puertos) si quiere mas permisos necesita loggearse. (prototipo de lo que podria ser si hay tiempo, quizas el ultimo tipo de usuario no se haga aun por tiempos pero veremos)
12. cambiar a postgres la bd (pendiente a hacer luego de tener las funcionalidades realizadas)
13. front react tailwind, chart.js 
14. api y bd en la nube
15. Guardar registros en nube estilo “cloud save”

16. Captura para enriquecer dispositivos (IMPORTANTE hacerlo bien para obetener la mejor informacion al capturar datos)
17. CRUD para datos de dispositivos, analisis, notas, diferentes cosas que sean utiles que el usuario pueda modificar para conveniencia de uso practico del sistema
18. Capacidad de bloquear dispositivos de la red si el que utiliza el sistema lo considera no conocido.(podriamos ver de agregar este tipo de cosas que generar un mayor control en la red tambien, claramente solo si tiene el backend instalado)



# tareas:
alertas de cambios de puertos
automatizar tareas con cron/management commands + registros de ejecucion
modulo de captura pasiva/activa para enriquecer dispositivos 1/2

crud de dispositivos/analiticas para gestion manual
notificaciones y reportes
roles y autenticacion (jwt)
migrar a postrgres
api rest django consumo externo y sync
guardado "cloud save" + arquitectura multiagente(tokens/registro de agente)
front react tailwind chart.js reusa api o pensar en react native desarrollo movil

heurísticas, fingerprinting, signatures, bloqueo de dispositivos. Estos son diferenciales; documentá qué heurística o técnica aplicás y qué limitaciones tiene.

mirar como ejecutar la aplicacion para evitar usar la vm
# Anotaciones 061125
- ubicado en monet:
para evitar la vm ejecutar:
# sudo -E "$(pwd)/.venv/bin/python" backend/manage.py runserver 

- ubicado en backend 
sudo -E /home/jorcas/Documentos/2025-2doCuatrimestre/Seminario/monet/.venv/bin/python manage.py runserver


# Anotaciones 071125
creacion de models en captura y analitica
creacion de services managment commands en captura(pendiente leer y comprender, tambien probar)

tareas:
1. Autenticación y roles en Django
- modificacion en setting, urls, creacion de login.html, importacion login_required en agente detector y escaner, creacion de comando que crea los tipos de usuarios en backend management commands

- cambio de nombre en carpeta backend ahora se llama config para evitar confusiones cambios en asgi.py,setting.py,wsgi.py,manage.py

2. API REST con DRF (en este mismo proyecto)
creacion de app api, archivo serializers para dispositivo capturasesion y viewsets, se exponen como endpoints read-only
config urls que incluye api
registracion de viewsets en api/urls
se activo en config/settings rest_framework y se configuro REST_FRAMEWORK para usar SessionAuthentication + IsAuthenticated por defecto

3. Analítica y alertas
creacion de services engine.py que recorre HeuristicaRegla activas y genera HeuristicaEvento a partir de los datos de captura y puertos (reglas listas: umbral_trafico, puerto_sensible, puerto_persistente).
Se agregó el comando  evaluar_heuristicas para disparar manualmente la evaluación y los eventos ya se pueden consultar por admin o por /api/alertas/.
Todos los modelos de captura/analítica están registrados en el admin 
El sniffer ahora detecta hostnames desde DHCP/DNS/mDNS y los aplica al inventario junto con heurísticas que clasifican los dispositivos por tipo; cada hostname y tipo guarda la fuente (captura/detector/manual) para mantener trazabilidad.
# Anotaciones 101125 y Anotaciones 111125
4. Frontend
instalacion de react, tailwind3
instalacion de react-router-dom
instalacion de shadcn y flowbite
uso de bloques de shadcn para estructura general login y signup
trabajando con la api para configurarla correctamente y autenticacion
- se limpió la UI vieja de Django, quedando solo la API + admin.
- agregamos endpoints `/api/auth/*` (csrf, login, logout, me, register) y probamos el flujo completo con curl usando el superusuario `monet`.
- todos los modelos expuestos por la API ahora tienen `owner` y los viewsets filtran por `request.user`; los comandos (`detectar_hosts`, `capturar_*`, `escanea_puertos`, `evaluar_heuristicas`) aceptan `--owner` y usan `resolve_owner`.
- configuramos CORS/cookies (`MONET_FRONTEND_ORIGIN`, `MONET_SESSION_COOKIE`, etc.) para que el front consuma la API usando sesiones.
- por el momento esta pensado para que cada usuario solo pueda ver sus datos y no ajenos 
# Anotaciones 121125
- Integración completa del layout shadcn (sidebar y header) en el front nuevo: reemplazamos el shell previo por `AppSidebar`, `SiteHeader` con breadcrumbs dinámicos y `SidebarProvider`.
- Login/Signup conectados a la API: formularios usan `AuthContext`, sesión se hidrata vía `/api/auth/me`, y las rutas protegidas redirigen según autenticación.
- Módulos Agente y Detector listos en React:
  - Hooks + servicios (`useAgentStatus`, `useDetectorAnalyses`, etc.) consumen los endpoints y manejan CSRF/errores.
  - Cada página tiene cards de acción, historial paginado, tablas con smooth scroll y toasts (Sonner) para feedback.
  - Se agregó paginación custom, combobox de ubicación, toasts centrados y tabla responsive para hosts.
- Backend: endpoints de detector y agente ajustados para owner + slug de ubicación; migraciones nuevas para `AgenteLocal`.
- Documentación/PlanTrabajo actualizados (nuevos pendientes: refactor por features y plan para módulo Captura).
- Captura (pasiva y activa):
  - API now lanza `run_passive_capture` y `run_active_probe` desde `/api/capturas/ejecutar/` (hilos, validación de parámetros, re-cómputo de estadísticas y contadores).
  - UI renovada con cards independientes, filtros asistidos/avanzados, bloqueo de botones y toasts según estado, paginación con badges, botones para abortar y scroll suave al detalle.
  - Detalles de sesión distinguen pasiva vs activa (estadísticas vs acciones registradas) y la columna de historial refleja el tipo y cantidad de acciones.
# Anotaciones 131125
- Detector / Inventario:
  - El serializer de `Dispositivo` ahora expone `primera_vez` y `es_temporal`, y el viewset marca automáticamente como inactivos los registros con más de 30 min sin actualización antes de ordenar por `ultima_vez`.
  - En el front reemplazamos la tabla manual por el data table de shadcn/tanstack (búsqueda, filtros, columns toggle, orden por defecto usando `ultima_vez`) y reorganizamos las columnas a: Estado · MAC · IP · Vendor · SO · Primera/Última vez.
- Detalle de dispositivo:
  - La card principal ocupa todo el ancho y muestra todos los campos disponibles (badges para estado, MAC aleatoria, temporalidad, fingerprint timestamps, etc.) con fechas formateadas.
  - El historial ahora compara correctamente la IP vigente en cada momento (IP actual = IP de la fila anterior) y la tabla lista también la IP registrada, MAC, inicio/fin y motivo de la variación.
  - La card de puertos queda debajo como placeholder hasta integrar el módulo de escaneo.
  - correcion en el modulo agente en el select ahora se puede elegir cualquier tipo de nombres o los tipicos. Tooltip en S0 en detalle de dispositivo

# Tareas por hacer cuando funcione todo lo basico


5. Integracion nube
6. Envio de correos/notificaciones, reportes pdf/csv, tareas programadas(cron/celery)
