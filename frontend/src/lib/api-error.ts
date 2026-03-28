import { ApiError } from "@/services/apiClient"

export function parseApiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (typeof error.payload === "object" && error.payload) {
      if ("detail" in error.payload) {
        return String((error.payload as { detail?: string }).detail)
      }
      const firstKey = Object.keys(error.payload as Record<string, unknown>)[0]
      if (firstKey) {
        const value = (error.payload as Record<string, unknown>)[firstKey]
        if (Array.isArray(value)) {
          return String(value[0])
        }
        if (value) {
          return String(value)
        }
      }
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
