import { useCallback, useEffect, useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorAnalysis } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useDetectorAnalyses(limit = 20) {
  const [analyses, setAnalyses] = useState<DetectorAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await detectorService.fetchAnalyses(limit)
      setAnalyses(data)
    } catch (err) {
      setAnalyses([])
      setError(parseApiError(err, "No se pudo obtener el historial de análisis."))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  return { analyses, loading, error, reload: load }
}
