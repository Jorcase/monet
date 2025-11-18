import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { ChevronDownIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination } from "@/components/ui/pagination"
import { useAgentStatus } from "@/hooks/useAgentStatus"
import { useAgentHistory } from "@/hooks/useAgentHistory"
import { parseApiError } from "@/lib/api-error"
import { LocationSelect } from "@/components/location-select"

const HISTORY_PAGE_SIZE = 5

export default function AgentPage() {
  const { data, loading, error, refreshing, refresh } = useAgentStatus()
  const {
    data: history,
    loading: historyLoading,
    error: historyError,
    reload: reloadHistory,
  } = useAgentHistory()

  const [interfaz, setInterfaz] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const showLoader = loading && !data

  useEffect(() => {
    setUbicacion(data?.ubicacion ?? "")
  }, [data?.ubicacion])

  const handleRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionError(null)
    try {
      const trimmedInterface = interfaz.trim()
      const trimmedLocation = ubicacion.trim()
      const promise = refresh(trimmedInterface || undefined, trimmedLocation)
      toast.promise(promise, {
        loading: "Actualizando agente...",
        success: "Agente actualizado correctamente",
        error: (err) => parseApiError(err, "No se pudo ejecutar el agente."),
      })
      await promise
      setInterfaz("")
      if (ubicacion !== trimmedLocation) {
        setUbicacion(trimmedLocation)
      }
      await reloadHistory()
    } catch (err) {
      setActionError(parseApiError(err, "No se pudo ejecutar el agente."))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agente de red</h1>
          <p className="text-sm text-muted-foreground">
            Ejecuta la detección local y consulta el historial de snapshots.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF 
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ejecutar/Actualizar agente</CardTitle>
            <CardDescription>
              Puedes indicar una interfaz y un alias de tu ubicacion antes de ejecutar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleRun}>
              <div className="space-y-2">
                <Label htmlFor="interfaz">Interfaz (opcional)</Label>
                <Input
                  id="interfaz"
                  name="interfaz"
                  placeholder="enp7s0"
                  value={interfaz}
                  onChange={(event) => setInterfaz(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ejemplos: <code>eth0</code>, <code>wlan0</code>, etc.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Alias (ubicación)</Label>
                <LocationSelect value={ubicacion} onChange={setUbicacion} />
                <p className="text-xs text-muted-foreground">
                  Elige una ubicación típica o escribí un alias propio.
                </p>
              </div>
              {actionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              ) : null}
              <Button type="submit" disabled={refreshing} className="w-full">
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Obtener agente"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del último agente</CardTitle>
            <CardDescription>
              {data ? `Última actualización: ${formatDate(data.ultima_actualizacion)}` : "Sin registros"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {showLoader && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando estado...
              </div>
            )}
            {!showLoader && error && !data ? (
              <p className="text-destructive">{error}</p>
            ) : null}
            {!showLoader && !error && !data ? (
              <p className="text-muted-foreground">
                Ejecuta el agente para registrar el primer snapshot.
              </p>
            ) : null}
            {data ? (
              <div className="space-y-2">
                <InfoRow label="Ubicación" value={data.ubicacion || "Sin ubicación definida."} />
                <InfoRow label="Hostname" value={data.hostname} />
                <InfoRow label="Interfaz" value={data.interfaz} />
                <InfoRow label="IP local" value={`${data.ip_local}/${data.cidr}`} />
                <InfoRow label="MAC" value={data.mac} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <HistorySection
        loading={historyLoading}
        error={historyError}
        history={history}
      />
    </div>
  )
}

function HistorySection({
  loading,
  error,
  history,
}: {
  loading: boolean
  error: string | null
  history: ReturnType<typeof useAgentHistory>["data"]
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [history])

  const paginatedHistory = useMemo(() => {
    const start = (page - 1) * HISTORY_PAGE_SIZE
    return history.slice(start, start + HISTORY_PAGE_SIZE)
  }, [history, page])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de snapshots</CardTitle>
        <CardDescription>Últimos registros del agente local.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay registros. Ejecuta el agente para ver el historial aquí.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedHistory.map((item) => (
                <details
                  key={`${item.id}-${item.ultima_actualizacion}`}
                  className="group rounded-lg border border-border/70 px-4 transition-colors hover:border-border"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 py-3 text-sm font-medium">
                    <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:gap-4">
                      <span>{formatDate(item.ultima_actualizacion)}</span>
                      <span className="text-muted-foreground">
                        {item.interfaz} · {item.ip_local}/{item.cidr} ·{" "}
                        {item.ubicacion || "Sin ubicación"}
                      </span>
                    </div>
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform group-open:-rotate-180" />
                  </summary>
                  <div className="mb-3 grid gap-2 border-t border-border/70 pt-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <InfoRow label="Ubicación" value={item.ubicacion || "Sin ubicación"} />
                    <InfoRow label="Hostname" value={item.hostname} />
                    <InfoRow label="MAC" value={item.mac} />
                    <InfoRow label="Interfaz" value={item.interfaz} />
                    <InfoRow label="IP" value={`${item.ip_local}/${item.cidr}`} />
                  </div>
                </details>
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="mt-4 flex justify-end">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border px-3 py-2">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}
