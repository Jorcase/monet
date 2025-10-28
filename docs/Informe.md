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
se utilizara sqlite de django por defecto para el desarrollo de la version 1.0, luego se migrara a postgres

# Anotaciones 11102025:
Probe en pruebascapy.py para ver si funcionaba al igual con nmap con un archivo pruebanmap.py
# Anotaciones 12102025:
Termine de definir la funcionalidad de la primera version del backend local junto a las posibles tablas para guardar informacion en la base de datos.
Preparando el entorno para empezar a trabajar en el desarrollo

# Anotaciones 19102025 - primer modulo
en backend settings agregamos la app
creado el modulo agente y migrado
agregado psutil a requirements, uso de libreria de sockets y ipaddress en network_info.py
carpeta services, archivo network_info que obtiene la informacion de la maquina ejecutante
carpeta management/commands/refresh_agente.py automatizacion del guardado de datos con un management command, permite correr python manage.py refresh_agente para update or create del agente local
agregamos views.py
creamos templates html y css para ver el modulo
cambiamos en settings el time_zone
pruebas correctas con diferentes interfaces, se probo que no permita la interfaz lo
pruebas en la vm y tambien funciona correctamente, se pulleo los cambios, se instalaron los requerimientos, se migro y se probo.

# Anotaciones 20102025 - segundo modulo
creacion del models para el modulo detector
agregar en settings la app
agregue scapy en requirements
creacion de network_range.py en services, sirve para saber que rango debe barrer el escaner
para probarlo:    python manage.py shell 
                  → from detector.services.network_range import get_local_network 
                  → get_local_network()
creacion de arp_scan.py
para ejecutarlo en la vm debo utilizar sudo por los privilegios
la latencia es una latencia aproximada, proximas versiones deberiamos mejorar con las posibilidades que proporciona scapy .time y eso implica guardar medir cada paquete por separado modificando la logica de este archivo
creacion de persistence.py un helper que ayuda a automatizar y desglosar la informacion en sus respectivas tablas
creacion de command 
python manage.py detectar_hosts
permite ejecutar toda la logica del modulo, podria servir para automatizar analisis diarios

# Anotaciones 21102025 - segundo modulo
creacion de vistas, html y css para probar el modulo
pusheado y pulleado en la vm para iniciar pruebas
para actualizar en la vm --IMPORTANTE--:
# sudo python3 -m pip install --break-system-packages -r requirements.txt
de ahi se puede correr normalmente y probar
notas de las pruebas: 
      algunos dispositivos como celulares si no estan en uso, no son detectados pero si estan siendo utilizados si, un dispositivo al conectarse a una red wifi por defecto utiliza mac aleatoria, para cambiar eso debe configurarse el dispositivo

# Anotaciones 261025 - segundo modulo
cambio en el modelo de detector en dispositivo para poder registrar bien los dispositivos
problema: dispositivos conectados por wifi por defecto tienen mac aleatoria lo que hace ineficiente el guardado de datos en dispositivos
solucion: intentar obtener el hostname en todos los dispositivos y detectar cuando la mac es aleatoria para que a la hora de guardar en dispositivo, sea por el hostname si esque se encuentra sino por ip de ultimo caso y marcar como dispositivo temporal.
actualizacion para detectar latencia con cada dispositivo, luego la general del analisis, mejora para intentar detectar el hostname de los dispositivos, mejora para el campo de estado de los dispositivos, mejora en las vistas para poder debuggear bien todas las pruebas, ya se reconocen los dispositivos si esque tienen mac constante o aleatoria y se actualiza si esque son temporarios o no.

# Anotaciones 271025 - segundo modulo
dependencia opcional en la VM - IMPORTANTE - sudo apt install samba-common-bin - Para nmblookup
creacion en services, hostname.py para poder intentar detectar el hostname en la deteccion de dispositivos en la red local, utilizando dns inverso con libreria de sockets, luego con netBIOS(nmblookup) NBNS, funciona como fallback pero poco eficiente ya que los dispositivos actuales no trabajan con eso o lo tienen desactivado por defecto al igual que los rooters, la obtencion de hostname se intentara resolver mas adelante en el modulo de captura_pasiva
se agrego en models de dispostivo el campo vendor, capaz de detectar con los primeros 3 bytes de la mac el fabricante de cada dispositivo, se creo un helper que utiliza netaddr para resolverlo, ahora en teoria se podria agregar como informacion a cada dispositvo.
vistas creadas para primera presentacion del backend local generadas con ia para ahorrar tiempo por el momento utilizando solamente html y css
