export interface DetectorDevice {
  id: number
  hostname: string
  hostname_fuente: string
  ip: string
  mac: string
  mac_aleatoria: boolean
  es_temporal: boolean
  vendor: string
  estado: string
  tipo_dispositivo: string
  tipo_fuente: string
  metodo_identificacion: string
  sistema_operativo: string
  fuente_fingerprint: string
  primera_vez: string
  ultima_fingerprint: string | null
  ultima_vez: string
}

export interface DetectorHost {
  id: number
  analisis_id: number
  ip: string
  mac: string
  hostname: string
  metodo_deteccion: string
  latencia_ms: number | null
  primera_vista: string
  ultima_vista: string
  notas: string
  device_info?: {
    id: number
    vendor: string
    mac_aleatoria: boolean
    primera_vez: string
    ultima_vez: string
    estado: string
    sistema_operativo?: string
    fuente_fingerprint?: string
  } | null
}

export interface DetectorAnalysis {
  id: number
  inicio: string
  fin: string | null
  interfaz: string
  tipo: string
  total_hosts_detectados: number
  duracion_ms: number | null
  notas: string
  hosts_detectados: DetectorHost[]
}

export interface DeviceHistoryEntry {
  id: number
  dispositivo: string
  ip: string
  mac: string
  inicio: string
  fin: string | null
  motivo: string
}
