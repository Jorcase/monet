import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DeviceHistoryEntry } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useDeviceHistory(dispositivoId?: number) {
  const [entries, setEntries] = useState<DeviceHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!dispositivoId) {
      setEntries([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchDeviceHistory(dispositivoId)
      setEntries(data)
    } catch (err) {
      setEntries([])
      setError(parseApiError(err, "No se pudo obtener el historial del dispositivo."))
    } finally {
      setLoading(false)
    }
  }, [dispositivoId])

  useEffect(() => {
    load()
  }, [load])

  return { entries, loading, error, reload: load }
}
