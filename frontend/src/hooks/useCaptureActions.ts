import { useCallback, useEffect, useState } from "react"

import { captureService } from "@/services/captureService"
import type { CaptureAction } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useCaptureActions(sesionId?: number, limit = 20) {
  const [actions, setActions] = useState<CaptureAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sesionId) {
      setActions([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await captureService.fetchCaptureActions(sesionId, { limit })
      setActions(data)
    } catch (err) {
      setActions([])
      setError(parseApiError(err, "No se pudieron obtener las acciones activas."))
    } finally {
      setLoading(false)
    }
  }, [sesionId, limit])

  useEffect(() => {
    load()
  }, [load])

  return { actions, loading, error, reload: load }
}
