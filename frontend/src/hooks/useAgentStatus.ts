import { useCallback, useEffect, useState } from "react"

import { agentService } from "@/services/agentService"
import type { AgenteLocal } from "@/types/agent"
import { parseApiError } from "@/lib/api-error"

interface AgentState {
  data: AgenteLocal | null
  loading: boolean
  error: string | null
  refreshing: boolean
  refresh: (interfaz?: string, ubicacion?: string) => Promise<AgenteLocal | null>
  reload: () => Promise<void>
}

export function useAgentStatus(): AgentState {
  const [data, setData] = useState<AgenteLocal | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await agentService.fetchAgentStatus()
      setData(status)
    } catch (err) {
      const message = parseApiError(err, "No se pudo obtener el estado del agente.")
      setError(message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(async (interfaz?: string, ubicacion?: string) => {
    setRefreshing(true)
    setError(null)
    try {
      const status = await agentService.refreshAgent(interfaz, ubicacion)
      setData(status)
      return status
    } catch (err) {
      const message = parseApiError(err, "No se pudo actualizar el agente.")
      setError(message)
      throw err
    } finally {
      setRefreshing(false)
    }
  }, [])

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    reload: load,
  }
}
