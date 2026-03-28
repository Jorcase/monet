import type { DetectorDevice } from "@/types/detector"

export interface ScannerJob {
  id: number
  objetivo: string
  tipo_scan: string
  estado: string
  inicio: string
  fin: string | null
  notas: string
}

export interface ScannerPort {
  id: number
  host_ip: string
  puerto: number
  protocolo: string
  servicio: string
  estado: string
  detected_at: string
  trabajo: ScannerJob
}

export interface ScannerSummary {
  id: number
  host_ip: string
  puerto: number
  protocolo: string
  servicio: string
  estado: string
  primera_detectado: string
  ultima_detectado: string
  ultima_trabajo_id: number | null
  dispositivo: DetectorDevice | null
}

export interface RunScannerPayload {
  include_local?: boolean
  include_active_devices?: boolean
  targets?: string[]
  analisis_ids?: number[]
  analisis_id?: number
  tipo: string
  puertos?: string
}
