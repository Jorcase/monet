import { useCallback, useState } from "react"

import { scannerService } from "@/services/scannerService"
import type { RunScannerPayload } from "@/types/scanner"
import { parseApiError } from "@/lib/api-error"

export function useRunScanner() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (payload: RunScannerPayload) => {
    setLoading(true)
    setError(null)
    try {
      const job = await scannerService.runScannerScan(payload)
      return job
    } catch (err) {
      setError(parseApiError(err, "No se pudo ejecutar el escaneo."))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { run, loading, error }
}
