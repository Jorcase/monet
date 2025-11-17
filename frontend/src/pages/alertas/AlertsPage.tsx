import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAnalyticsRules } from "@/hooks/useAnalyticsRules"
import { useAnalyticsEvents } from "@/hooks/useAnalyticsEvents"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { Link } from "react-router-dom"

const SEVERITY_ORDER = ["critica", "alta", "media", "baja"]
const SEVERITY_LABELS: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
}

export default function AlertsPage() {
  const {
    rules,
    loading: rulesLoading,
    error: rulesError,
  } = useAnalyticsRules()
  // Traemos suficientes eventos para métricas y luego hacemos slicing local para el listado corto.
  const eventsFilters = useMemo(() => ({ limit: 500 }), [])
  const {
    events,
    loading: eventsLoading,
    error: eventsError,
  } = useAnalyticsEvents(eventsFilters)

  const metrics = useMemo(() => {
    const active = rules.filter((rule) => rule.activa).length
    const inactive = rules.length - active
    const last24h = events.filter((event) => {
      const diff = Date.now() - new Date(event.ts).getTime()
      return diff <= 24 * 60 * 60 * 1000
    }).length
    const openEvents = events.filter((event) => !event.notificado).length
    return { active, inactive, last24h, openEvents }
  }, [rules, events])

  const topEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const severityDiff =
        SEVERITY_ORDER.indexOf(a.severidad) - SEVERITY_ORDER.indexOf(b.severidad)
      if (severityDiff !== 0) return severityDiff
      return new Date(b.ts).getTime() - new Date(a.ts).getTime()
    })
  }, [events])

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Motor de Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Seguimiento de reglas heurísticas y eventos generados por tus módulos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Reglas activas" value={metrics.active} loading={rulesLoading} />
        <SummaryCard title="Reglas deshabilitadas" value={metrics.inactive} loading={rulesLoading} />
        <SummaryCard title="Eventos últimos 24h" value={metrics.last24h} loading={eventsLoading} />
        <SummaryCard title="Eventos pendientes" value={metrics.openEvents} loading={eventsLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Resumen de reglas</CardTitle>
              <CardDescription>Listado rápido de reglas activas recientemente.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/alertas/reglas">Ver reglas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <LoadingMessage text="Cargando reglas..." />
            ) : rulesError ? (
              <p className="text-sm text-destructive">{rulesError}</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no configuraste reglas.</p>
            ) : (
              <div className="space-y-3">
                {rules.slice(0, 5).map((rule) => (
                  <div key={rule.id} className="rounded border border-border/70 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{rule.nombre}</p>
                      <Badge variant={rule.activa ? "default" : "secondary"}>
                        {rule.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {renderModule(rule.modulo_objetivo)} · {renderType(rule.tipo)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Eventos recientes</CardTitle>
              <CardDescription>Alertas generadas por las reglas más críticas.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/alertas/eventos">Ver todo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <LoadingMessage text="Cargando eventos..." />
            ) : eventsError ? (
              <p className="text-sm text-destructive">{eventsError}</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No se registraron eventos aún.</p>
            ) : (
              <div className="space-y-3">
                {topEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded border border-border/70 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{event.regla_detalle.nombre}</p>
                      <Badge variant={severityToVariant(event.severidad)} className="capitalize">
                        {SEVERITY_LABELS[event.severidad] ?? event.severidad}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{event.descripcion}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.ts).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  loading,
}: {
  title: string
  value: number
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function renderModule(value: string) {
  switch (value) {
    case "captura":
      return "Captura"
    case "detector":
      return "Detector"
    case "escaner":
      return "Escáner"
    case "global":
      return "Global"
    default:
      return value
  }
}

function renderType(value: string) {
  switch (value) {
    case "comportamiento":
      return "Comportamiento"
    case "firma":
      return "Firma"
    case "fingerprinting":
      return "Fingerprinting"
    default:
      return "Otro"
  }
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

function LoadingMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  )
}
