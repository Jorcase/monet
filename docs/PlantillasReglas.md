# Plantillas de reglas heurísticas (API backend)

Guía rápida de los valores `parametros` (JSON) soportados por el motor de reglas, agrupados por módulo. Úsalas al crear/editar reglas desde el front (campo “Parámetros”) o vía API.


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

## Notas
- `modulo_objetivo` debe alinearse con el módulo donde se genera la evidencia (`captura`, `escaner`, `detector` o `global`).  
- Si `parametros` incluye listas (puertos, dominios, categorías), se recomienda usar minúsculas para cadenas.  
- Las categorías de dominio provienen de `categoria_dominio` en `CapturaFlujo`; los sufijos definidos en “Dominios categorizados” alimentan ese campo.
