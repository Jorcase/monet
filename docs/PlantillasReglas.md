# Plantillas de reglas heurísticas (API backend)

Guía rápida de los valores `parametros` (JSON) soportados por el motor de reglas, agrupados por módulo. Úsalas al crear/editar reglas desde el front (campo “Parámetros”) o vía API.

## Captura / Global
- **Umbral de tráfico** (`umbral_trafico`):  
  ```json
  { "tipo": "umbral_trafico", "limite_bytes": 10000000 }
  ```
- **Puertos sensibles** (`puerto_sensible`): alerta si el flujo toca alguno de estos puertos.  
  ```json
  { "tipo": "puerto_sensible", "puertos": [22, 3389, 5900] }
  ```
- **Categoría de dominio** (`categoria_dominio`): usa `categoria_dominio` del flujo.  
  ```json
  { "tipo": "categoria_dominio", "categorias": ["mercadolibre", "apuestas"] }
  ```
- **Dominio/SNI específico** (`dominio_especifico`): matchea sufijos de host/SNI.  
  ```json
  { "tipo": "dominio_especifico", "dominios": ["mlstatic.com", "chatgpt.com"] }
  ```

## Escáner / Global
- **Cambio de estado de puerto** (`cambio_puerto`): al pasar de un estado a otro.  
  ```json
  { "tipo": "cambio_puerto", "cambios": [["abierto","cerrado"], ["abierto","filtrado"]] }
  ```
- **Estado de puerto objetivo** (`estado_puerto`): cuando un puerto queda en un estado concreto.  
  ```json
  { "tipo": "estado_puerto", "estado": "abierto", "puertos": [80,443], "protocolos": ["tcp"] }
  ```
- **Umbral de puertos abiertos por host** (`umbral_puertos_abiertos`): resume por host.  
  ```json
  { "tipo": "umbral_puertos_abiertos", "umbral": 6, "protocolos": ["tcp","udp"] }
  ```
- **Puerto persistente** (`puerto_persistente`): puerto abierto por n días.  
  ```json
  { "tipo": "puerto_persistente", "dias": 7 }
  ```

## Detector / Global
- **Nuevo dispositivo descubierto** (`nuevo_host` en la implementación actual): se dispara cuando se crea un `Dispositivo` nuevo (no cada host detectado).  
  ```json
  { "tipo": "nuevo_host" }
  ```
- **MAC aleatoria detectada** (`mac_aleatoria`):  
  ```json
  { "tipo": "mac_aleatoria" }
  ```
- **MAC específica (lista de watchlist)** (`mac_especifica`):  
  ```json
  { "tipo": "mac_especifica", "macs": ["aa:bb:cc:dd:ee:ff"] }
  ```
- **Cambio de hostname** (`cambio_hostname`):  
  ```json
  { "tipo": "cambio_hostname" }
  ```
- **Cambio de IP** (`cambio_ip`):  
  ```json
  { "tipo": "cambio_ip" }
  ```

## Notas
- `modulo_objetivo` debe alinearse con el módulo donde se genera la evidencia (`captura`, `escaner`, `detector` o `global`).  
- Si `parametros` incluye listas (puertos, dominios, categorías), se recomienda usar minúsculas para cadenas.  
- Las categorías de dominio provienen de `categoria_dominio` en `CapturaFlujo`; los sufijos definidos en “Dominios categorizados” alimentan ese campo.


# Reglas creadas
Captura
Umbral de trafico superado
{
  "tipo": "umbral_trafico",
  "limite_bytes": 10000000
}
Ingreso a redes sociales o mercado libre
{
  "tipo": "categoria_dominio",
  "categorias": [
    "mercadolibre",
    "redes_sociales"
  ]
}
Puertos Sensibles
{
  "tipo": "puerto_sensible",
  "puertos": [
    22,
    3389,
    5900
  ]
}
Ingreso a pagina web especifica
{
  "tipo": "dominio_especifico",
  "dominios": [
    "chatgpt.com"
  ]
}
detector
Cambio de Hostname
{
  "tipo": "cambio_hostname"
}
Cambio de ip de un dispositivo
{
  "tipo": "cambio_ip"
}
Dispositivo con Mac Aleatoria
{
  "tipo": "mac_aleatoria"
}
Mac especifica detectada
{
  "tipo": "mac_especifica",
  "macs": [
    "20:1f:3b:d9:cc:8a"
  ]
}
Nuevo dispositivo descubierto
{
  "tipo": "nuevo_host"
}
Escaner
Cambio de estado de puertos
{
  "tipo": "cambio_puerto",
  "cambios": [
    [
      "abierto",
      "cerrado"
    ],
    [
      "cerrado",
      "abierto"
    ],
    [
      "abierto",
      "filtrado"
    ],
    [
      "filtrado",
      "abierto"
    ]
  ]
}
Estado de un puerto
{
  "tipo": "estado_puerto",
  "estado": "abierto",
  "puertos": [
    80,
    443
  ],
  "protocolos": [
    "tcp"
  ]
}
Puerto persistente
{
  "tipo": "puerto_persistente",
  "dias": 7
}
Umbral de puertos abiertos por dispositivo
{
  "tipo": "umbral_puertos_abiertos",
  "umbral": 6,
  "protocolos": [
    "tcp",
    "udp"
  ]
}
