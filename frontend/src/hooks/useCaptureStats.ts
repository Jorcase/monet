import { useCallback, useEffect, useState } from "react"

import { captureService } from "@/services/captureService"
import type { CaptureStatistics } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useCaptureStats(sesionId?: number) {
  const [stats, setStats] = useState<CaptureStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sesionId) {
      setStats(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await captureService.fetchCaptureStats(sesionId)
      setStats(data)
    } catch (err) {
      setStats(null)
      setError(parseApiError(err, "No se pudo obtener la estadística de la captura."))
    } finally {
      setLoading(false)
    }
  }, [sesionId])

  useEffect(() => {
    load()
  }, [load])

  return { stats, loading, error, reload: load }
}
