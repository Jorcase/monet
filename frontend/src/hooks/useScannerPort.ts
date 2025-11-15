import { useCallback, useEffect, useState } from "react"

import { scannerService } from "@/services/scannerService"
import type { ScannerPort } from "@/types/scanner"
import { parseApiError } from "@/lib/api-error"

export function useScannerPort(portId?: number) {
  const [port, setPort] = useState<ScannerPort | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!portId) {
      setPort(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await scannerService.fetchScannerPort(portId)
      setPort(data)
    } catch (err) {
      setPort(null)
      setError(parseApiError(err, "No se pudo obtener el puerto seleccionado."))
    } finally {
      setLoading(false)
    }
  }, [portId])

  useEffect(() => {
    load()
  }, [load])

  return { port, loading, error, reload: load }
}
