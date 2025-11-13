import { useCallback, useEffect, useState } from "react"

import { captureService } from "@/services/captureService"
import type { CaptureFile } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useCaptureFiles(sesionId?: number, limit = 50) {
  const [files, setFiles] = useState<CaptureFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sesionId) {
      setFiles([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await captureService.fetchCaptureFiles(sesionId, { limit })
      setFiles(data)
    } catch (err) {
      setFiles([])
      setError(parseApiError(err, "No se pudieron obtener los archivos de la captura."))
    } finally {
      setLoading(false)
    }
  }, [sesionId, limit])

  useEffect(() => {
    load()
  }, [load])

  return { files, loading, error, reload: load }
}
