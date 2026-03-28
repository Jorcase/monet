import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorHost } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useHost(hostId?: number) {
  const [host, setHost] = useState<DetectorHost | null>(null)
  const [loading, setLoading] = useState(Boolean(hostId))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!hostId) {
      setHost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await detectorService.fetchHost(hostId)
      setHost(result)
      if (!result) {
        setError("No se encontró el host solicitado.")
      }
    } catch (err) {
      setHost(null)
      setError(parseApiError(err, "No se pudo cargar el host."))
    } finally {
      setLoading(false)
    }
  }, [hostId])

  useEffect(() => {
    load()
  }, [load])

  return { host, loading, error, reload: load }
}
