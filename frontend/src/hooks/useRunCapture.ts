import { useState } from "react"

import { captureService, type CaptureRunPayload } from "@/services/captureService"
import type { CaptureSession } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useRunCapture() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (payload: CaptureRunPayload): Promise<CaptureSession | null> => {
    setLoading(true)
    setError(null)
    try {
      const session = await captureService.runCaptureSession(payload)
      return session
    } catch (err) {
      setError(parseApiError(err, "No se pudo iniciar la captura."))
      return null
    } finally {
      setLoading(false)
    }
  }

  return { run, loading, error }
}
