import { useCallback, useEffect, useState } from "react"

import { analyticsService } from "@/services/analyticsService"
import type { AnalyticsEvent } from "@/types/analytics"
import type { EventFilters } from "@/services/analyticsService"
import { parseApiError } from "@/lib/api-error"

export function useAnalyticsEvents(filters?: EventFilters) {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyticsService.fetchEvents(filters)
      setEvents(data)
    } catch (err) {
      setEvents([])
      setError(parseApiError(err, "No se pudieron obtener los eventos."))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  return { events, loading, error, reload: load, setEvents }
}
