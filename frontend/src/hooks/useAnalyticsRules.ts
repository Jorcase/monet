import { useCallback, useEffect, useState } from "react"

import { analyticsService } from "@/services/analyticsService"
import type { AnalyticsRule } from "@/types/analytics"
import { parseApiError } from "@/lib/api-error"

export function useAnalyticsRules(filters?: Parameters<typeof analyticsService.fetchRules>[0]) {
  const [rules, setRules] = useState<AnalyticsRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyticsService.fetchRules(filters)
      setRules(data)
    } catch (err) {
      setRules([])
      setError(parseApiError(err, "No se pudieron obtener las reglas."))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  return { rules, loading, error, reload: load, setRules }
}
