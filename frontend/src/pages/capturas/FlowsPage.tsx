import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCaptureSessions } from "@/hooks/useCaptureSessions"
import { useCaptureFlows } from "@/hooks/useCaptureFlows"
import { FlowsDataTable } from "@/pages/capturas/FlowsDataTable"

export default function FlowsPage() {
  const navigate = useNavigate()
  const { sessions, loading: sessionsLoading } = useCaptureSessions(10)
  const [selectedSession, setSelectedSession] = useState<number | undefined>()
  const [filters] = useState({
    search: "",
    proto: "todos",
    doh: false,
  })
  const { flows, loading: flowsLoading, error, reload } = useCaptureFlows(selectedSession)

  useEffect(() => {
    if (!selectedSession && sessions.length) {
      setSelectedSession(sessions[0].id)
    }
  }, [sessions, selectedSession])

  const filtered = flows.filter((f) => {
    const search = filters.search.trim()
    const matchesSearch =
      !search ||
      f.src_ip.includes(search) ||
      f.dst_ip.includes(search) ||
      (f.src_mac || "").includes(search) ||
      (f.dst_mac || "").includes(search) ||
      (f.sni || "").includes(search) ||
      (f.categoria_dominio || "").includes(search)
    const matchesProto =
      filters.proto === "todos" ||
      f.proto_aplicacion === filters.proto ||
      (!f.proto_aplicacion && f.protocolo === filters.proto)
    const matchesDoh = filters.doh ? f.es_doh_dot : true
    return matchesSearch && matchesProto && matchesDoh
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Flujos capturados</h1>
        <p className="text-sm text-muted-foreground">
          Explora los paquetes agregados por sesión y revisa los metadatos L7.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {sessions.length > 0 ? (
              <>
                <Select
                  defaultValue={String(sessions[0].id)}
                  onValueChange={(v) => setSelectedSession(Number(v))}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Seleccioná sesión" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        #{s.id} · {s.interfaz ?? "?"} · {s.estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => reload()}>
                  Recargar
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No hay sesiones aún.</p>
            )}
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Selecciona una sesión para ver sus flujos agregados.
          </CardDescription>
          
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando sesiones...
            </div>
          )}
          {flowsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando flujos...
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay flujos para esta sesión.</p>
          ) : (
            <FlowsDataTable
              data={filtered}
              loading={flowsLoading}
              error={error ?? undefined}
              onRowClick={(flow) =>
                navigate(`/captura/paquetes/${flow.id}`, {
                  state: { flow, sessionId: selectedSession },
                })
              }
            />
          )}
        </CardContent>
      </Card>

    </div>
  )
}
