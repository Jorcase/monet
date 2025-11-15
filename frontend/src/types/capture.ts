export interface CaptureStatistics {
  hosts_unicos: number
  puertos_unicos: number
  protocolos_top: Record<string, number>
  ancho_banda_promedio: number | null
  ancho_banda_pico: number | null
  alertas_generadas: number
  actualizado: string
}

export interface CaptureSession {
  id: number
  interfaz: string
  modo: string
  origen: string
  estado: string
  inicio: string
  fin: string | null
  duracion_objetivo: number | null
  filtro_bpf: string
  total_paquetes: number
  total_bytes: number
  paquetes_descartados: number
  ruta_pcap: string
  hash_pcap: string
  observaciones: string
  archivos_count: number
  flujos_count: number
  tiene_estadistica: boolean
  estadistica_resumen: CaptureStatistics | null
}

export interface CaptureFile {
  id: number
  tipo: string
  ruta: string
  tamano_bytes: number
  hash_archivo: string
  protegido: boolean
  expira_en: string | null
  creado: string
}

export interface CaptureFlow {
  id: number
  ventana_inicio: string
  ventana_fin: string
  direccion: string
  src_ip: string
  dst_ip: string
  src_port: number | null
  dst_port: number | null
  src_mac: string
  dst_mac: string
  protocolo: string
  paquetes: number
  bytes: number
  flag_syn: boolean
  flag_fin: boolean
  flag_rst: boolean
  ttl_promedio: number | null
  tcp_window_promedio: number | null
  tcp_mss: number | null
  tcp_opciones: string
  payload_muestra: string
  dispositivo_origen: DetectorDevice | null
  dispositivo_destino: DetectorDevice | null
}

export interface DetectorDevice {
  id: number
  hostname: string
  hostname_fuente: string | null
  ip: string | null
  mac: string | null
  mac_aleatoria: boolean
  vendor: string | null
  estado: string | null
  tipo_dispositivo: string | null
  tipo_fuente: string | null
  metodo_identificacion: string | null
  sistema_operativo: string | null
  fuente_fingerprint: string | null
  ultima_fingerprint: string | null
  ultima_vez: string | null
}

export interface CaptureFingerprint {
  id: number
  metodo: string
  sistema_estimado: string
  version_estimado: string
  probabilidad: number | null
  evidencia: Record<string, unknown>
  timestamp: string
  dispositivo: DetectorDevice | null
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
