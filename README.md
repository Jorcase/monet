# Monet · Guía de instalación

Repositorio principal del proyecto **Monet** (backend local en Django + frontend Vite/React).  
Este README resume el flujo “clonar → configurar → ejecutar” en una máquina Ubuntu limpia con VS Code.

---
## 0. Instalación de una VM propia (opcional)

Si preferís trabajar aislado en una máquina virtual, te recomendamos:

| Concepto              | Valor sugerido 

| SO                    | Ubuntu 24.04 LTS (64 bits)
| CPU                   | 2 vCPU 
| RAM                   | ≥ 4 GB
| Disco                 | ≥ 40 GB 
| Red                   | Adaptador “Bridged” + modo promiscuo “Allow All” 
| Software base         | VS Code / editor a elección 

Esto asegura que los módulos de red (captura/escaneo) puedan ver tu LAN real y que la VM tenga recursos suficientes para compilar el frontend y correr Django.

## 1. Requisitos previos

### 1.1 Paquetes de sistema

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git nmap tcpdump libpcap-dev curl
```

### 1.2 Node.js

Vite exige **Node 20.19+ o 22.12+**. Recomendamos Node 22 (LTS actual):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # debería mostrar v22.x (p. ej. v22.21.0)
```

> Si ya tenés una versión más nueva, también sirve. Evitá Node 18: provoca errores `crypto.hash is not a function`.

> **Tip de red**: aunque ya lo configures en la VM, verificalo al instalar: `ip a` debe mostrar tu interfaz física (ej. `enp6s0`, `wlan0`). Algunos comandos (captura pasiva/activa, escaneos) requieren permisos elevados y acceso real a la red.

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/jorcase/monet.git
cd monet
```

---

## 3. Configurar el backend (Django)

1. **Crear y activar** el virtualenv:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. **Instalar requirements**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. **Variables de entorno**:
   - Copiá `.env.example` a `.env` (o exportá variables antes de correr el servidor).
   - Valores mínimos: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `MONET_FRONTEND_ORIGIN`, etc.
4. **Migraciones**:
   ```bash
   cd backend
   python manage.py migrate
   cd ..
   ```
5. **Crear superusuario (opcional pero recomendado)**:
   ```bash
   cd backend
   python manage.py createsuperuser
   cd ..
   ```

### 3.1 Ejecutar el backend local

Algunos módulos requieren permisos elevados (capturas, escaneos). Para una experiencia completa:
```bash
sudo -E "$(pwd)/.venv/bin/python" backend/manage.py runserver
```

---

## 4. Configurar el frontend (Vite + React + Tailwind + shadcn)

1. Instalar dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Crear archivo de entorno:
   ```bash
   cp .env.example .env
   # Ajustar VITE_API_BASE_URL (por defecto http://localhost:8000/api)
   ```
3. Levantar en modo desarrollo:
   ```bash
   npm run dev
   ```
   Visitá `http://localhost:5173`.  
   (Asegurate de que el backend esté corriendo y que `MONET_FRONTEND_ORIGIN` incluya `http://localhost:5173`.)

4. Build de producción:
   ```bash
   npm run build
   npm run preview
   ```

---

## 5. Estructura del repositorio

| Carpeta/archivo          | Descripción 
| `backend/`               | Proyecto Django (apps: agente, detector, captura, analitica, etc.)
| `frontend/`              | Aplicación Vite/React (auth, sidebar shadcn, módulos UI).
| `docs/`                  | Documentación funcional (Informe, PlanTrabajo, diagramas).
| `pcaps/`                 | Carpeta local para capturas (`.pcap`). No subir al repo.
| `scripts/`               | Helpers y utilidades CLI. 
| `.env.example`           | Plantilla de variables para backend/frontend. 
| `requirements.txt`       | Dependencias Python.

---

## 6. Comandos útiles

| Tarea                        | Comando 
| Aplicar migraciones            | `python backend/manage.py migrate`
| Ejecutar tests Django        | `python backend/manage.py test` 
| Correr capturas/escaneos CLI | `sudo -E "$(pwd)/.venv/bin/python" backend/manage.py <command>`
| Levantar frontend dev        | `cd frontend && npm run dev` 
| Generar build frontend       | `cd frontend && npm run build` 

---

## 7. Notas adicionales

- Para ver interfaces disponibles: `ip a` (ej. `enp6s0`, `wlan0`).  
- En la VM solemos instalar algunas librerías globalmente (`scapy`, `python-nmap`, etc.) para simplificar pruebas rápidas. Aun así, el entorno recomendado es el virtualenv del repo.  
- La base de datos por defecto es SQLite (ideal para desarrollo). Para despliegues se migrará a PostgreSQL según planificación en `docs/PlanTrabajo.md`.


