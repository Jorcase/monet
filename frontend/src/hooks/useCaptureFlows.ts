import { useCallback, useEffect, useMemo, useState } from "react"

import { captureService, type CaptureFlowQuery } from "@/services/captureService"
import type { CaptureFlow, PaginatedResponse } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

interface FlowState extends PaginatedResponse<CaptureFlow> {
  page: number
  pageSize: number
}

const defaultPageState: FlowState = {
  count: 0,
  next: null,
  previous: null,
  results: [],
  page: 1,
  pageSize: 25,
}

export function useCaptureFlows(
  sesionId?: number,
  initialQuery: CaptureFlowQuery = { page: 1, page_size: 25 }
) {
  const [state, setState] = useState<FlowState>(defaultPageState)
  const [filters, setFilters] = useState<Omit<CaptureFlowQuery, "page" | "page_size">>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const page = state.page
  const pageSize = state.pageSize

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((state.count || 0) / pageSize || 1))
  }, [state.count, pageSize])

  const load = useCallback(
    async (overrides?: Partial<CaptureFlowQuery>) => {
      if (!sesionId) {
        setState(defaultPageState)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const query: CaptureFlowQuery = {
          page,
          page_size: pageSize,
          ...filters,
          ...overrides,
        }
        const data = await captureService.fetchCaptureFlows(sesionId, query)
        setState({
          ...data,
          page: query.page ?? 1,
          pageSize: query.page_size ?? pageSize,
        })
      } catch (err) {
        setState(defaultPageState)
        setError(parseApiError(err, "No se pudieron obtener los flujos de la captura."))
      } finally {
        setLoading(false)
      }
    },
    [sesionId, page, pageSize, filters]
  )

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      page: initialQuery.page ?? 1,
      pageSize: initialQuery.page_size ?? prev.pageSize,
    }))
    setFilters((prev) => ({
      ...prev,
      ...(initialQuery.direccion ? { direccion: initialQuery.direccion } : {}),
      ...(initialQuery.protocolo ? { protocolo: initialQuery.protocolo } : {}),
      ...(initialQuery.ip ? { ip: initialQuery.ip } : {}),
      ...(initialQuery.search ? { search: initialQuery.search } : {}),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesionId])

  useEffect(() => {
    load()
  }, [load])

  const setPage = (nextPage: number) => {
    setState((prev) => ({ ...prev, page: nextPage }))
  }

  const setPageSize = (nextSize: number) => {
    setState((prev) => ({ ...prev, pageSize: nextSize, page: 1 }))
  }

  const updateFilters = (nextFilters: Partial<Omit<CaptureFlowQuery, "page" | "page_size">>) => {
    setFilters((prev) => ({ ...prev, ...nextFilters }))
    setState((prev) => ({ ...prev, page: 1 }))
  }

  return {
    flows: state.results,
    count: state.count,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    next: state.next,
    previous: state.previous,
    setPage,
    setPageSize,
    filters,
    setFilters: updateFilters,
    reload: load,
  }
}
