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



