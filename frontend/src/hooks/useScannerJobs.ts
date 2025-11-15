import { useCallback, useEffect, useState } from "react"

import { scannerService } from "@/services/scannerService"
import type { ScannerJob } from "@/types/scanner"
import { parseApiError } from "@/lib/api-error"

export function useScannerJobs(params?: { estado?: string; tipo?: string; objetivo?: string }) {
  const [jobs, setJobs] = useState<ScannerJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await scannerService.fetchScannerJobs(params)
      setJobs(data)
    } catch (err) {
      setJobs([])
      setError(parseApiError(err, "No se pudo obtener el historial de trabajos."))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    load()
  }, [load])

  return { jobs, loading, error, reload: load, setJobs }
}
