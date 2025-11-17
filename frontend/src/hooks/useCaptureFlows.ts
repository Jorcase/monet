import { useCallback, useEffect, useMemo, useState } from "react"

import { parseApiError } from "@/lib/api-error"
import { captureService, type CaptureFlowQuery } from "@/services/captureService"
import type { CaptureFlow, PaginatedResponse } from "@/types/capture"

type FlowResponse = CaptureFlow[] | PaginatedResponse<CaptureFlow>

function normalize(resp: FlowResponse): CaptureFlow[] {
  if (Array.isArray(resp)) return resp
  if (resp && Array.isArray(resp.results)) return resp.results
  return []
}

export function useCaptureFlows(sesionId?: number, query: CaptureFlowQuery = {}) {
  const [flows, setFlows] = useState<CaptureFlow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseQuery = useMemo(() => ({ page_size: 500, ...query }), [query])
  const queryKey = useMemo(() => JSON.stringify(baseQuery), [baseQuery])
  const stableQuery = useMemo(() => baseQuery, [queryKey])

  const reload = useCallback(
    async (overrides?: CaptureFlowQuery) => {
      if (!sesionId) {
        setFlows([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const resp = await captureService.fetchCaptureFlows(sesionId, {
          ...stableQuery,
          ...overrides,
        })
        setFlows(normalize(resp as FlowResponse))
      } catch (err) {
        setFlows([])
        setError(parseApiError(err, "No se pudieron obtener los flujos de la captura."))
      } finally {
        setLoading(false)
      }
    },
    [sesionId, stableQuery, queryKey]
  )

  useEffect(() => {
    reload()
  }, [reload])

  return { flows, loading, error, reload }
}
