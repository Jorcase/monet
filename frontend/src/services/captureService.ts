import { apiClient } from "@/services/apiClient"
import type { PaginatedResponse, CaptureSession, CaptureFile, CaptureFlow, CaptureStatistics, CaptureFingerprint } from "@/types/capture"

export interface CaptureRunPayload {
  interfaz?: string
  origen?: string
  filtro_bpf?: string
  duracion_objetivo?: number
}

export interface CaptureFinalizePayload {
  estado?: "completada" | "abortada" | "error"
  observaciones?: string
}

export interface CaptureFlowQuery extends Record<string, string | number | undefined> {
  page?: number
  page_size?: number
  direccion?: string
  protocolo?: string
  ip?: string
  search?: string
}

export async function fetchCaptureSessions(query?: Record<string, string | number>) {
  return apiClient.get<CaptureSession[]>("/capturas/", { query })
}

export async function fetchCaptureSession(id: number) {
  return apiClient.get<CaptureSession>(`/capturas/${id}/`)
}

export async function fetchCaptureFiles(sesionId: number, params?: { limit?: number }) {
  return apiClient.get<CaptureFile[]>(`/capturas/${sesionId}/archivos/`, { query: params })
}

export async function fetchCaptureFlows(sesionId: number, params?: CaptureFlowQuery) {
  return apiClient.get<PaginatedResponse<CaptureFlow>>(`/capturas/${sesionId}/flujos/`, {
    query: params,
  })
}

export async function fetchCaptureStats(sesionId: number) {
  return apiClient.get<CaptureStatistics>(`/capturas/${sesionId}/estadistica/`)
}

export async function fetchCaptureFingerprints(
  sesionId: number,
  params?: { limit?: number }
) {
  return apiClient.get<CaptureFingerprint[]>(`/capturas/${sesionId}/fingerprints/`, {
    query: params,
  })
}

export async function runCaptureSession(payload: CaptureRunPayload) {
  return apiClient.post<CaptureSession>("/capturas/ejecutar/", payload)
}

export async function finalizeCaptureSession(id: number, payload?: CaptureFinalizePayload) {
  return apiClient.post<CaptureSession>(`/capturas/${id}/finalizar/`, payload ?? {})
}

export const captureService = {
  fetchCaptureSessions,
  fetchCaptureSession,
  fetchCaptureFiles,
  fetchCaptureFlows,
  fetchCaptureStats,
  fetchCaptureFingerprints,
  runCaptureSession,
  finalizeCaptureSession,
}
