import { useCallback, useEffect, useState } from "react"

import { captureService } from "@/services/captureService"
import type { CaptureSession } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useCaptureSession(id?: number) {
  const [session, setSession] = useState<CaptureSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) {
      setSession(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await captureService.fetchCaptureSession(id)
      setSession(data)
    } catch (err) {
      setSession(null)
      setError(parseApiError(err, "No se pudo obtener la sesión de captura."))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { session, loading, error, reload: load }
}
