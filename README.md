# monet — Backend local

Repositorio para el backend local del proyecto **Seminario**.  

---

## Estado actual (qué ya está hecho)
- Repo inicializado y primer commit realizado.  
- Rama `dev` creada y push al remoto.  
- Virtualenv local creado (`.venv`) y agregado a `.gitignore`.  
- `requirements.txt` generado.  
- Proyecto Django creado en `backend/`.  
- Apps esqueletos creadas: `agente`, `detector`, `escaner`, `captura`, `analitica`.  
- `.gitignore` actualizado para Python/Django/VSCode/pcaps.  
- Estructura básica creada: `backend/`, `docs/`, `scripts/`, `pcaps/`.

---

## Estructura del repositorio
- `backend/` — proyecto Django (código del backend local).  
- `docs/` — documentación del proyecto (md, diagramas, decisiones).  
- `scripts/` — utilidades y scripts auxiliares.  
- `pcaps/` — carpeta referencial para pcaps (no subir pcaps al repo).  
- `.env.example` — plantilla con variables de entorno (sin valores sensibles).  
- `requirements.txt` — dependencias del proyecto.

---

## Notas de entorno (VM / desarrollo local)
**Máquina de desarrollo (VM)**  
- SO: Ubuntu 24.04 LTS (usuario VM: `monet`)  
- Red VM: Bridged Adapter, Promiscuous Mode: Allow All  
- Para inspeccionar interfaces en la VM: `ip a` o `ifconfig` (ej: `enp6s0`)

**Dependencias instaladas en la VM (sistema / global)**
- `nmap`, `tcpdump`, `libpcap-dev`, `python3`, `pip3`, `git`  
- Paquetes Python instalados globalmente (en la VM): `scapy`, `python-nmap`, `pycryptodome`, `reportlab`, `psycopg2-binary`, `django`, `djangorestframework`

**Base de datos (estado actual)**
- Para desarrollo local se usa **SQLite** (configuración por defecto de Django) para acelerar el arranque.  
---

## Cómo arrancar el entorno de desarrollo local (resumen rápido)

1. Activar el virtualenv:
   source .venv/bin/activate
2. Instalar dependencias:
    pip install -r requirements.txt
3. Migraciones iniciales:
    cd backend
    python manage.py migrate

4. Levantar servidor:
    python manage.py runserver
    python manage.py runserver 0.0.0.0:8000