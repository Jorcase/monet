import { useCallback, useEffect, useState } from "react"

import { captureService } from "@/services/captureService"
import type { CaptureSession } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useCaptureSessions(limit = 20) {
  const [sessions, setSessions] = useState<CaptureSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await captureService.fetchCaptureSessions({ limit })
      setSessions(data)
    } catch (err) {
      setSessions([])
      setError(parseApiError(err, "No se pudo obtener el historial de capturas."))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  return { sessions, loading, error, reload: load }
}
