import { useCallback, useEffect, useState } from "react"

import { agentService } from "@/services/agentService"
import type { AgenteLocal } from "@/types/agent"
import { parseApiError } from "@/lib/api-error"

export function useAgentHistory(limit = 20) {
  const [data, setData] = useState<AgenteLocal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await agentService.fetchAgentHistory(limit)
      setData(items)
    } catch (err) {
      setError(parseApiError(err, "No se pudo obtener el historial del agente."))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
