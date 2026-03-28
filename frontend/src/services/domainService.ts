import { apiClient } from "@/services/apiClient"
import type { DomainCategory } from "@/types/capture"

export async function fetchDomainCategories() {
  return apiClient.get<DomainCategory[]>("/dominios/")
}

export async function createDomainCategory(payload: Omit<DomainCategory, "id" | "creado">) {
  return apiClient.post<DomainCategory>("/dominios/", payload)
}

export async function updateDomainCategory(id: number, payload: Partial<DomainCategory>) {
  return apiClient.patch<DomainCategory>(`/dominios/${id}/`, payload)
}

export async function deleteDomainCategory(id: number) {
  return apiClient.delete(`/dominios/${id}/`)
}

export const domainService = {
  fetchDomainCategories,
  createDomainCategory,
  updateDomainCategory,
  deleteDomainCategory,
}
