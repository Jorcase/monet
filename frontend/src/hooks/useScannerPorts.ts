import { useCallback, useEffect, useState } from "react"

import { scannerService } from "@/services/scannerService"
import type { ScannerPort } from "@/types/scanner"
import { parseApiError } from "@/lib/api-error"

export function useScannerPorts(params?: {
  trabajo_id?: number
  host_ip?: string
  protocolo?: string
  estado?: string
  limit?: number
}) {
  const [ports, setPorts] = useState<ScannerPort[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await scannerService.fetchScannerPorts(params)
      setPorts(data)
    } catch (err) {
      setPorts([])
      setError(parseApiError(err, "No se pudo obtener los puertos encontrados."))
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    load()
  }, [load])

  return { ports, loading, error, reload: load }
}
