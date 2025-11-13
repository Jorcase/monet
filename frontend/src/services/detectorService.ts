import { apiClient } from "@/services/apiClient"
import type {
  DetectorAnalysis,
  DetectorDevice,
  DetectorHost,
  DeviceHistoryEntry,
} from "@/types/detector"

export async function fetchAnalyses(limit = 20) {
  return apiClient.get<DetectorAnalysis[]>("/detector/analisis/", { query: { limit } })
}

export async function fetchDevices() {
  return apiClient.get<DetectorDevice[]>("/dispositivos/")
}

export async function fetchDevice(dispositivoId: number) {
  return apiClient.get<DetectorDevice>(`/dispositivos/${dispositivoId}/`)
}

export async function fetchHosts(params?: { analisis_id?: number; limit?: number }) {
  return apiClient.get<DetectorHost[]>("/detector/hosts/", { query: params })
}

export async function fetchDeviceHistory(dispositivoId: number) {
  return apiClient.get<DeviceHistoryEntry[]>(
    `/detector/dispositivos/${dispositivoId}/historial/`
  )
}

export async function runDetectorAnalysis(interfaz?: string, tipo?: string) {
  return apiClient.post<DetectorAnalysis>("/detector/ejecutar/", {
    ...(interfaz ? { interfaz } : {}),
    ...(tipo ? { tipo } : {}),
  })
}

export const detectorService = {
  fetchAnalyses,
  fetchDevices,
  fetchDevice,
  fetchHosts,
  fetchDeviceHistory,
  runDetectorAnalysis,
}
