import { useCallback, useEffect, useState } from "react"

import { domainService } from "@/services/domainService"
import type { DomainCategory } from "@/types/capture"
import { parseApiError } from "@/lib/api-error"

export function useDomainCategories() {
  const [categories, setCategories] = useState<DomainCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await domainService.fetchDomainCategories()
      setCategories(data)
    } catch (err) {
      setError(parseApiError(err, "No se pudieron cargar los dominios."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { categories, loading, error, reload: load, setCategories }
}
