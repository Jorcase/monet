
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDevices } from "@/hooks/useDevices"
import { useAnalyticsEvents } from "@/hooks/useAnalyticsEvents"
import { useAnalyticsRules } from "@/hooks/useAnalyticsRules"
import { useScannerSummary } from "@/hooks/useScannerSummary"

const SEVERITY_LABELS: Record<string, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
}

export default function DashboardPage() {
  const { devices, loading: devicesLoading } = useDevices()
  const { rules, loading: rulesLoading } = useAnalyticsRules()
  const eventFilters = useMemo(() => ({ limit: 500 }), [])
  const { events, loading: eventsLoading } = useAnalyticsEvents(eventFilters)
  const { summary: ports, loading: portsLoading } = useScannerSummary()

  const deviceStats = useMemo(() => {
    const total = devices.length
    const active = devices.filter((d) => d.estado === "activo").length
    const inactive = total - active
    const macRandom = devices.filter((d) => d.mac_aleatoria).length
    const osMap: Record<string, number> = {}
    devices.forEach((d) => {
      const os = (d.sistema_operativo || "Desconocido").toLowerCase()
      osMap[os] = (osMap[os] || 0) + 1
    })
    const osTop = Object.entries(osMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return { total, active, inactive, macRandom, osTop }
  }, [devices])

  const eventStats = useMemo(() => {
    const pending = events.filter((e) => !e.notificado).length
    const last24h = events.filter((e) => Date.now() - new Date(e.ts).getTime() <= 24 * 60 * 60 * 1000)
    const severityCounts: Record<string, number> = {}
    events.forEach((e) => {
      severityCounts[e.severidad] = (severityCounts[e.severidad] || 0) + 1
    })
    const recentEvents = [...events]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 5)
    return { pending, last24hCount: last24h.length, severityCounts, recentEvents }
  }, [events])

  const portStats = useMemo(() => {
    const byEstado: Record<string, number> = {}
    const byPort: Record<string, number> = {}
    ports.forEach((p) => {
      byEstado[p.estado] = (byEstado[p.estado] || 0) + 1
      const key = `${p.puerto}/${p.protocolo}`
      byPort[key] = (byPort[key] || 0) + 1
    })
    const estadoData = Object.entries(byEstado).map(([name, value]) => ({ name, value }))
    const topPorts = Object.entries(byPort)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return { estadoData, topPorts }
  }, [ports])

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="grid gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <MetricCard
          title="Dispositivos"
          value={deviceStats.total}
          loading={devicesLoading}
          description={`Activos ${deviceStats.active} · Inactivos ${deviceStats.inactive}`}
        />
        <MetricCard
          title="MAC aleatoria"
          value={deviceStats.macRandom}
          loading={devicesLoading}
          description="Dispositivos con MAC aleatoria detectada"
        />
        <MetricCard
          title="Reglas activas"
          value={rules.filter((r) => r.activa).length}
          loading={rulesLoading}
          description={`Total reglas ${rules.length}`}
        />
        <MetricCard
          title="Eventos pendientes"
          value={eventStats.pending}
          loading={eventsLoading}
          description={`Últimas 24h: ${eventStats.last24hCount}`}
        />
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Estados de puertos</CardTitle>
            <CardDescription>Resumen de puertos en los escaneos recientes.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portStats.estadoData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {portsLoading && <p className="text-xs text-muted-foreground mt-2">Cargando puertos...</p>}
            {!portsLoading && portStats.estadoData.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">Sin datos de puertos.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top puertos detectados</CardTitle>
            <CardDescription>Puertos con más ocurrencias en los resúmenes.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={portStats.topPorts} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {portsLoading && <p className="text-xs text-muted-foreground mt-2">Cargando puertos...</p>}
            {!portsLoading && portStats.topPorts.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">Sin datos de puertos.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Eventos recientes</CardTitle>
            <CardDescription>Últimas alertas generadas por tus reglas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventsLoading ? (
              <p className="text-sm text-muted-foreground">Cargando eventos...</p>
            ) : eventStats.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos todavía.</p>
            ) : (
              eventStats.recentEvents.map((event) => (
                <div key={event.id} className="rounded border border-border/70 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{event.regla_detalle?.nombre ?? `Regla #${event.regla}`}</p>
                    <Badge variant={severityToVariant(event.severidad)} className="capitalize">
                      {SEVERITY_LABELS[event.severidad] ?? event.severidad}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{event.descripcion}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.ts).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de sistemas</CardTitle>
            <CardDescription>Top sistemas operativos detectados.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceStats.osTop}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {deviceStats.osTop.map((_, idx) => (
                    <Cell key={idx} fill={`hsl(var(--chart-${(idx % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {devicesLoading && <p className="text-xs text-muted-foreground mt-2">Cargando dispositivos...</p>}
            {!devicesLoading && deviceStats.osTop.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">Sin datos de sistemas operativos.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
  loading,
}: {
  title: string
  value: number
  description?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold">
          {loading ? <span className="text-muted-foreground text-base">Cargando...</span> : value}
        </CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
    </Card>
  )
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
