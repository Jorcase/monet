# monet — Backend local (Seminario)

Repositorio para el backend local del proyecto Seminario.
Estructura inicial y notas de configuración.

## Estructura inicial
- backend/        -> proyecto Django (pendiente de crear)
- docs/           -> documentación
- scripts/        -> utilidades y scripts
- pcaps/          -> carpeta referencial para pcaps (prod: /var/seminario/pcaps)
- .env.example    -> variables de entorno de ejemplo

## Notas rapidas
- VM: Ubuntu 24.04 LTS (usuario: monet)
- Red: Bridged Adapter, Promiscuous Mode: Allow All
- Dependencias de sistema: nmap, tcpdump, libpcap-dev, etc.
