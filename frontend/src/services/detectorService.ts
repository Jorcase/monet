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

export interface HostQuery {
  analisis_id?: number
  limit?: number
  host_id?: number
  mac?: string
  ip?: string
}

export async function fetchHosts(params?: HostQuery) {
  const query: Record<string, string | number> = {}
  if (params?.analisis_id != null) query.analisis_id = params.analisis_id
  if (params?.limit != null) query.limit = params.limit
  if (params?.host_id != null) query.host_id = params.host_id
  if (params?.mac) query.mac = params.mac
  if (params?.ip) query.ip = params.ip
  return apiClient.get<DetectorHost[]>("/detector/hosts/", { query })
}

export async function fetchHost(hostId: number) {
  const results = await fetchHosts({ host_id: hostId, limit: 1 })
  return results[0] ?? null
}

export async function fetchHostHistory(filters: { mac?: string; ip?: string; limit?: number }) {
  return fetchHosts({
    mac: filters.mac,
    ip: filters.ip,
    limit: filters.limit ?? 200,
  })
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
  fetchHost,
  fetchHostHistory,
  fetchDeviceHistory,
  runDetectorAnalysis,
}
