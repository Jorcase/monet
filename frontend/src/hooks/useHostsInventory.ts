import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorHost } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useHostsInventory() {
  const [hosts, setHosts] = useState<DetectorHost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchHosts()
      setHosts(data)
    } catch (err) {
      setHosts([])
      setError(parseApiError(err, "No se pudo obtener la lista de hosts."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { hosts, loading, error, reload: load }
}
