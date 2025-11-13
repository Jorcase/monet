import { useState } from "react"

import { detectorService } from "@/services/detectorService"
import type { DetectorAnalysis } from "@/types/detector"
import { parseApiError } from "@/lib/api-error"

export function useRunDetector() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (
    interfaz?: string,
    tipo?: string
  ): Promise<DetectorAnalysis | null> => {
    setLoading(true)
    setError(null)
    try {
      const analysis = await detectorService.runDetectorAnalysis(interfaz, tipo)
      return analysis
    } catch (err) {
      setError(parseApiError(err, "No se pudo ejecutar el análisis de red."))
      return null
    } finally {
      setLoading(false)
    }
  }

  return { run, loading, error }
}
