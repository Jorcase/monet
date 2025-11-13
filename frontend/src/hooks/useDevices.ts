import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorDevice } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useDevices(autoLoad = true) {
  const [devices, setDevices] = useState<DetectorDevice[]>([])
  const [loading, setLoading] = useState(autoLoad)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchDevices()
      setDevices(data)
    } catch (err) {
      setDevices([])
      setError(parseApiError(err, "No se pudo obtener la lista de dispositivos."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      load()
    }
  }, [autoLoad, load])

  return { devices, loading, error, reload: load }
}
