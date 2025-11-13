import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorHost } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

interface Options {
  analisisId?: number
  limit?: number
}

export function useDetectorHosts({ analisisId, limit = 200 }: Options = {}) {
  const [hosts, setHosts] = useState<DetectorHost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!analisisId) {
      setHosts([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchHosts({
        analisis_id: analisisId,
        limit,
      })
      setHosts(data)
    } catch (err) {
      setHosts([])
      setError(parseApiError(err, "No se pudo obtener los hosts detectados."))
    } finally {
      setLoading(false)
    }
  }, [analisisId, limit])

  useEffect(() => {
    load()
  }, [load])

  return { hosts, loading, error, reload: load }
}
