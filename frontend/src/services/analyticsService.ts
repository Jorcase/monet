import { apiClient } from "@/services/apiClient"
import type {
  AnalyticsEvent,
  AnalyticsRule,
  CreateRulePayload,
  UpdateRulePayload,
} from "@/types/analytics"

export interface EventFilters {
  severidad?: string
  modulo?: string
  regla_id?: number
  dispositivo_id?: number
  notificado?: boolean
  desde?: string
  hasta?: string
  limit?: number
}

export interface RuleFilters {
  modulo?: string
  tipo?: string
  activa?: boolean
  search?: string
}

export async function fetchRules(filters?: RuleFilters) {
  const query: Record<string, string | number> = {}
  if (filters?.modulo) query.modulo = filters.modulo
  if (filters?.tipo) query.tipo = filters.tipo
  if (filters?.search) query.search = filters.search
  if (filters?.activa !== undefined) query.activa = String(filters.activa)
  return apiClient.get<AnalyticsRule[]>("/reglas/", { query })
}

export async function createRule(payload: CreateRulePayload) {
  return apiClient.post<AnalyticsRule>("/reglas/", payload)
}

export async function updateRule(id: number, payload: UpdateRulePayload) {
  return apiClient.patch<AnalyticsRule>(`/reglas/${id}/`, payload)
}

export async function deleteRule(id: number) {
  return apiClient.delete(`/reglas/${id}/`)
}

export async function fetchEvents(filters?: EventFilters) {
  const query: Record<string, string | number> = {}
  if (filters?.severidad) query.severidad = filters.severidad
  if (filters?.modulo) query.modulo = filters.modulo
  if (filters?.regla_id) query.regla_id = filters.regla_id
  if (filters?.dispositivo_id) query.dispositivo_id = filters.dispositivo_id
  if (filters?.notificado !== undefined) query.notificado = String(filters.notificado)
  if (filters?.desde) query.desde = filters.desde
  if (filters?.hasta) query.hasta = filters.hasta
  if (filters?.limit) query.limit = filters.limit
  return apiClient.get<AnalyticsEvent[]>("/alertas/", { query })
}

export async function markEventNotified(id: number, notificado: boolean) {
  return apiClient.post<AnalyticsEvent>(`/alertas/${id}/notificado/`, { notificado })
}

export const analyticsService = {
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  fetchEvents,
  markEventNotified,
}
