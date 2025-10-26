[App móvil / App web]  <--->  [API REST en la nube]  <--->  [Backend local (Docker o VM)]
                                       |
                                 [Base de datos PostgreSQL]
Informe
Maquina Virtual: Ubuntu 24.04 LTS,
Configuracion escencial: Bridged Adapter, Promiscuous Mode: Allow All
User: monet 
Pass: ubuntu
Ver interfaz: ifconfig o ip a (ej enp6s0)

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



