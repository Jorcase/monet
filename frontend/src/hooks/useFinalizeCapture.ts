import { useState } from "react"

import { captureService, type CaptureFinalizePayload } from "@/services/captureService"
import type { CaptureSession } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useFinalizeCapture() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalize = async (
    id: number,
    payload?: CaptureFinalizePayload
  ): Promise<CaptureSession | null> => {
    setLoading(true)
    setError(null)
    try {
      const session = await captureService.finalizeCaptureSession(id, payload)
      return session
    } catch (err) {
      setError(parseApiError(err, "No se pudo finalizar la captura."))
      return null
    } finally {
      setLoading(false)
    }
  }

  return { finalize, loading, error }
}
