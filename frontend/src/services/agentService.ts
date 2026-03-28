import { apiClient } from "@/services/apiClient"
import type { AgenteLocal } from "@/types/agent"

export async function fetchAgentStatus() {
  return apiClient.get<AgenteLocal>("/agente/estado/")
}

export async function fetchAgentHistory(limit = 20) {
  return apiClient.get<AgenteLocal[]>("/agente/historial/", { query: { limit } })
}

export async function refreshAgent(interfaz?: string, ubicacion?: string) {
  const payload: Record<string, string> = {}
  if (interfaz) payload.interfaz = interfaz
  if (ubicacion !== undefined) payload.ubicacion = ubicacion
  return apiClient.post<AgenteLocal>("/agente/refresh/", payload)
}

export const agentService = {
  fetchAgentStatus,
  fetchAgentHistory,
  refreshAgent,
}
