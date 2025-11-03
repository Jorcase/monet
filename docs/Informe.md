[App móvil / App web]  <--->  [API REST en la nube]  <--->  [Backend local (Docker o VM)]
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
# Anotaciones 11125 - tercer modulo
creacion de las vistas y mejora en funcionalidades para el tratado de datos obtenidos en el escaneo, el modulo puede escanear ips que el usuario elija(pueden ser varias), puede elegir dispositivos activos(MEJORA PENDIENTE DE QUE SE CONSIDERA ACTIVO EN DISPOSITIVOS), o elegir analisis recientes que tienen las ips mas recientes(lo mismo que en dispositivos)
hay varios tipos de escaneo, por ahora 3 pero estoy agregando la funcionalidad de poder elegir comandos a eleccion
mejora visual de que puerto es de que ip

# Anotaciones 31125 - tercer modulo
se ajusto el guardado de puertos, se creo una tabla para llevar registro y evitar duplicaciones cuando un puerto esta enlazado a un dispositivo en especifico, similar a historial_dispositivos
ahora se supone que guarda algunos puertos cerrados y todos los filtrados
mejora visual para mirar la informacion recolectada por los modulos
mejora en el nav bar
mejora completa para --- PRIMERA PRESENTACION ---

pendiente revisar en la vm el funcionamiento y ponerse a mirar todo el codigo

