import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CheckCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAnalyticsEvents } from "@/hooks/useAnalyticsEvents"
import { analyticsService } from "@/services/analyticsService"
import type { AnalyticsEvent } from "@/types/analytics"
import { Textarea } from "@/components/ui/textarea"

const SEVERITIES = [
  { label: "Todas", value: "todas" },
  { label: "Crítica", value: "critica" },
  { label: "Alta", value: "alta" },
  { label: "Media", value: "media" },
  { label: "Baja", value: "baja" },
]

const MODULES = [
  { label: "Todos", value: "todos" },
  { label: "Captura", value: "captura" },
  { label: "Detector", value: "detector" },
  { label: "Escáner", value: "escaner" },
  { label: "Global", value: "global" },
]

export default function AlertEventsPage() {
  const [severityFilter, setSeverityFilter] = useState("todas")
  const [moduleFilter, setModuleFilter] = useState("todos")
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [limit, setLimit] = useState(500)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selectedEvent, setSelectedEvent] = useState<AnalyticsEvent | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const eventFilters = useMemo(
    () => ({
      severidad: severityFilter === "todas" ? undefined : severityFilter,
      modulo: moduleFilter === "todos" ? undefined : moduleFilter,
      notificado: onlyOpen ? false : undefined,
      limit,
    }),
    [severityFilter, moduleFilter, onlyOpen, limit]
  )
  const { events, loading, error, setEvents } = useAnalyticsEvents(eventFilters)

  useEffect(() => {
    setPage(1)
  }, [events, severityFilter, moduleFilter, onlyOpen, limit])

  const handleMark = async (event: AnalyticsEvent, notificado: boolean) => {
    try {
      const updated = await analyticsService.markEventNotified(event.id, notificado)
      setEvents((prev) => prev.map((item) => (item.id === event.id ? updated : item)))
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(updated)
      }
      toast.success(notificado ? "Evento marcado como notificado" : "Evento marcado como pendiente")
    } catch {
      toast.error("No se pudo actualizar el evento.")
    }
  }

  const formattedEvents = useMemo(() => events, [events])
  const totalPages = Math.max(1, Math.ceil(formattedEvents.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return formattedEvents.slice(start, start + pageSize)
  }, [formattedEvents, currentPage])

  const handleSelectEvent = (event: AnalyticsEvent) => {
    setSelectedEvent(event)
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Eventos heurísticos</h1>
        <p className="text-sm text-muted-foreground">
          Explora y marca los eventos generados por tus reglas de analítica.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
            <CardDescription>Aplica filtros para encontrar el evento que buscás.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <label className="text-xs uppercase text-muted-foreground">Límite</label>
                <Input
                  type="number"
                  min={50}
                  max={500}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value) || 200)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={onlyOpen} onCheckedChange={setOnlyOpen} />
                Sólo pendientes
              </label>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando eventos...
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : formattedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No se encontraron eventos.</p>
            ) : (
              <div className="space-y-3">
                <div className="w-full overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Severidad</TableHead>
                        <TableHead>Regla</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleEvents.map((event) => (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer"
                          onClick={() => handleSelectEvent(event)}
                        >
                          <TableCell>{new Date(event.ts).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={severityToVariant(event.severidad)} className="capitalize">
                              {renderSeverity(event.severidad)}
                            </Badge>
                          </TableCell>
                          <TableCell>{event.regla_detalle?.nombre ?? `Regla #${event.regla}`}</TableCell>
                          <TableCell>{event.dispositivo?.hostname || event.dispositivo?.ip || "—"}</TableCell>
                          <TableCell>{event.notificado ? "Notificado" : "Pendiente"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMark(event, !event.notificado)
                              }}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              {event.notificado ? "Reabrir" : "Notificar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Página {currentPage} de {totalPages} · {formattedEvents.length} eventos
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card ref={detailRef}>
          <CardHeader>
            <CardTitle>Detalle del evento</CardTitle>
            <CardDescription>Selecciona un evento para ver más información.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedEvent ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">Regla</p>
                  <p className="font-medium">{selectedEvent.regla_detalle?.nombre}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {renderModule(selectedEvent.regla_detalle?.modulo_objetivo ?? "desconocido")}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={severityToVariant(selectedEvent.severidad)} className="capitalize">
                    {renderSeverity(selectedEvent.severidad)}
                  </Badge>
                  <span>{new Date(selectedEvent.ts).toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Descripción</p>
                  <p>{selectedEvent.descripcion}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Dispositivo</p>
                  <p>
                    {selectedEvent.dispositivo?.hostname
                      ? `${selectedEvent.dispositivo.hostname} (${selectedEvent.dispositivo.ip})`
                      : selectedEvent.dispositivo?.ip || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Evidencia</p>
                  <Textarea
                    readOnly
                    className="min-h-[140px] font-mono text-xs"
                    value={JSON.stringify(selectedEvent.evidencia ?? {}, null, 2)}
                  />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Elige un evento en la tabla para ver los detalles aquí.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function renderSeverity(value: string) {
  const option = SEVERITIES.find((option) => option.value === value)
  return option?.label ?? value
}

function renderModule(value: string) {
  const option = MODULES.find((option) => option.value === value)
  return option?.label ?? value
}

function severityToVariant(value: string): "default" | "secondary" | "destructive" | "outline" {
  switch (value) {
    case "critica":
      return "destructive"
    case "alta":
      return "default"
    case "media":
      return "secondary"
    default:
      return "outline"
  }
}
