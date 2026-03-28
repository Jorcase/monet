import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorHost } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useHostHistory(filters: { mac?: string; ip?: string } = {}) {
  const [entries, setEntries] = useState<DetectorHost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!filters.mac && !filters.ip) {
      setEntries([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchHostHistory({
        mac: filters.mac,
        ip: filters.ip,
      })
      setEntries(data)
    } catch (err) {
      setEntries([])
      setError(parseApiError(err, "No se pudo obtener el historial del host."))
    } finally {
      setLoading(false)
    }
  }, [filters.mac, filters.ip])

  useEffect(() => {
    load()
  }, [load])

  return { entries, loading, error, reload: load }
}
