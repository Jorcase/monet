import { useCallback, useEffect, useState } from "react"

import { captureService } from "@/services/captureService"
import type { CaptureFingerprint } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useCaptureFingerprints(sesionId?: number, limit = 50) {
  const [fingerprints, setFingerprints] = useState<CaptureFingerprint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sesionId) {
      setFingerprints([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await captureService.fetchCaptureFingerprints(sesionId, { limit })
      setFingerprints(data)
    } catch (err) {
      setFingerprints([])
      setError(parseApiError(err, "No se pudieron obtener los fingerprints de la captura."))
    } finally {
      setLoading(false)
    }
  }, [sesionId, limit])

  useEffect(() => {
    load()
  }, [load])

  return { fingerprints, loading, error, reload: load }
}
