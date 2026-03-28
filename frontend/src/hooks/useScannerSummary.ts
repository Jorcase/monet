import { useCallback, useEffect, useState } from "react"

import { scannerService } from "@/services/scannerService"
import type { ScannerSummary } from "@/types/scanner"
import { parseApiError } from "@/lib/api-error"

export function useScannerSummary(params?: {
  host_ip?: string
  dispositivo_id?: number
  protocolo?: string
  puerto?: number
  estado?: string
}) {
  const [summary, setSummary] = useState<ScannerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await scannerService.fetchScannerSummary(params)
      setSummary(data)
    } catch (err) {
      setSummary([])
      setError(parseApiError(err, "No se pudo obtener el resumen de puertos."))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    load()
  }, [load])

  return { summary, loading, error, reload: load }
}
