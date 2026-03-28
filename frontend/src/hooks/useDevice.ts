import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorDevice } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useDevice(dispositivoId?: number) {
  const [device, setDevice] = useState<DetectorDevice | null>(null)
  const [loading, setLoading] = useState(Boolean(dispositivoId))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!dispositivoId) {
      setDevice(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchDevice(dispositivoId)
      setDevice(data)
    } catch (err) {
      setDevice(null)
      setError(parseApiError(err, "No se pudo obtener el detalle del dispositivo."))
    } finally {
      setLoading(false)
    }
  }, [dispositivoId])

  useEffect(() => {
    load()
  }, [load])

  return { device, loading, error, reload: load }
}
