Estructura del Proyecto
## Modulos:
# 1 - Agente_local(info de inicio)
Funcionalidad: 
	1 - detecta y guarda ip-local, cidr, mac, interfaz, hostname al iniciar el servicio y actualiza ultima-actualizacion
    2 - expone info para la app movil y valida verificacion de red

# 2 - Deteccion_Hosts
Funcionalidad: 
	1 - Usa agente-local para obtener IP y mascara.
    2 - Calcula rango de red.
    3 - Hace barrido ARP / ping (excluir propia y broadcast).
    4 - Para hosts que responden: insertar fila en host-detectado (siempre) y, si hay MAC, crear/actualizar dispositivo.
    Mejora: encolar targets para el escaner-puertos (lista de IPs a escanear).

# 3 - Escaner_Puertos
Funcionalidad:
	1-Ejecuta scans activos
	2-Acepta analisis-id + lista/rango de IPs + tipo-scan (rapido / tcp-only / udp)
	3-Normaliza resultados y guarda en puerto-encontrado
	4-Actualiza trabajo-escaner(registro del job) y al terminar actualiza analisis-red.total-hosts-conectados
	
# 4 - Captura_pasiva
Funcionalidad:
	1-Elegir interfaz y duracion
	2-Capturar paquetes TCP
	3-Separar entrada/salida comparando con ip-local
	4-Agrupar por ventanas(ej. 10s) y por 5-tupla; almacenar solo grupos relevantes en estadistica-paquete
	5-Guardar captura.ruta-pcap en disco si se necesita evidencia.
Notas:
    - Si no hay anomalías: registrar resumen (captura + estadísticas agregadas) y marcar como “sin anomalías”.
    - Si hay anomalías: generar evento y guardar ruta_pcap + observaciones (no almacenar cada paquete en la BD).	
	
# 5 - Analitica_eventos
Funcionalidad:
	Mantener reglas y logica que analizan outputs de captura-pasiva, escaner-puertos y deteccion-hosts para generar evento/alerta.
Opcional: permitir que los otros módulos hagan llamadas a la analítica para “chequear reglas” en tiempo real.

## Tablas:
# agente_local:
id | 
interfaz (varchar) | 
ip-local (inet) | 
cidr (int)  |
mac (macaddr) | 
hostname (varchar) | 
ultima-actualizacion (timestamp with time zone) |
notas (text)


# analisis_red:
id |
inicio (timestamp) |
fin (timestamp) |
interfaz (varchar) |
tipo (varchar) -- 'escaner-activo'|'captura-pasiva'|'mixto' |
total-hosts-detectados (integer) |
notas (text)

# host-detectado
id |
analisis-id (FK -> analisis-red) |
ip (inet) |
mac (macaddr nullable) |
metodo-deteccion (varchar) -- 'arp'|'ping'|'nmap'|'passive'..
latencia-ms (int nullable) |
hostname (varchar nullable) |
primera-vista (timestamp) |
ultima-vista (timestamp) |
notas (text)


# dispositivo:
id |
ip (inet) |
mac (macaddr) |
hostname (varchar) |
primera-vez (timestamp) |
ultima-vez (timestamp) |
estado (varchar) -- 'activo'|'inactivo'|'desconocido'

- priorizar mac como identificador cuando este disponible

# puerto_encontrado:
id |
analisis-id (FK -> analisis-red) |
host-detectado-id (FK -> host-detectado, nullable) |
dispositivo-id (FK -> dispositivo, nullable) |
puerto (integer) |
protocolo (varchar) -- 'tcp'|'udp' |
servicio (varchar nullable) |
state (varchar) -- 'abierto'|'filtrado'|'cerrado' |
detected-at (timestamp)

# trabajo_scaner:
id |
analisis-id (FK -> analisis-red) |
objetivo (varchar) -- IP o rango |
tipo-scan (varchar) -- 'rapido'|'tcp-only'|'udp'... |
state (varchar) -- 'pendiente'|'ejecutando'|'completado'|'error' |
inicio (timestamp) |
fin (timestamp) |
notas (text)
	
# captura
id |
analisis-id (FK -> analisis-red) |
interfaz (varchar) |
inicio (timestamp) |
fin (timestamp) |
direccion (varchar) -- 'entrada'|'salida'|'ambas' |
total-pkt (integer) |
ruta-pcap (varchar) |
notas (text)


# estadistica_paquete
id |
captura-id (FK -> captura) |
ventana-inicio (timestamp) |
ventana-fin (timestamp) |
src-ip (inet) |
dst-ip (inet) |
src-port (integer nullable) |
dst-port (integer nullable) |
protocolo (varchar) |
cant (bigint) |
observaciones (text nullable)

# evento
id |
tipo (varchar) -- ej. 'scan-pasivo','syn-flood','puerto-sensible' |
dispositivo-id (FK nullable) |
analisis-id (FK nullable) |
captura-id (FK nullable) |
severidad (varchar) -- 'baja'|'media'|'alta' |
descripcion (text) |
ts (timestamp)

# dispositivo_historial 
id |
dispositivo-id (FK -> dispositivo) |
ip (inet) |
mac (macaddr) |
inicio (timestamp) |
fin (timestamp) |
motivo (varchar) -- 'dhcp'|'reasignacion'...

