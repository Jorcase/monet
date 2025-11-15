import { apiClient } from "@/services/apiClient"
import type { RunScannerPayload, ScannerJob, ScannerPort, ScannerSummary } from "@/types/scanner"

export async function fetchScannerJobs(params?: { estado?: string; tipo?: string; objetivo?: string }) {
  return apiClient.get<ScannerJob[]>("/trabajos/", { query: params })
}

export async function fetchScannerPorts(params?: {
  trabajo_id?: number
  host_ip?: string
  protocolo?: string
  estado?: string
  limit?: number
}) {
  return apiClient.get<ScannerPort[]>("/puertos/", { query: params })
}

export async function fetchScannerPort(portId: number) {
  return apiClient.get<ScannerPort>(`/puertos/${portId}/`)
}

export async function fetchScannerSummary(params?: {
  host_ip?: string
  dispositivo_id?: number
  protocolo?: string
  puerto?: number
  estado?: string
}) {
  return apiClient.get<ScannerSummary[]>("/puertos-resumen/", { query: params })
}

export async function runScannerScan(payload: RunScannerPayload) {
  return apiClient.post<ScannerJob>("/escaner/ejecutar/", payload)
}

export const scannerService = {
  fetchScannerJobs,
  fetchScannerPorts,
  fetchScannerPort,
  fetchScannerSummary,
  runScannerScan,
}
