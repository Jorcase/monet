import { type FormEvent, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Pagination } from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCaptureSessions } from "@/hooks/useCaptureSessions"
import { useRunCapture } from "@/hooks/useRunCapture"
import { useFinalizeCapture } from "@/hooks/useFinalizeCapture"
import { useCaptureStats } from "@/hooks/useCaptureStats"
import type { CaptureSession } from "@/types/capture"
import { cn } from "@/lib/utils"

const ORIGINS = [
  { value: "manual", label: "Manual" },
  { value: "cron", label: "Programada" },
  { value: "api", label: "Remota" },
]

export default function CapturePage() {
  const { sessions, loading, error, reload } = useCaptureSessions(20)
  const [selectedId, setSelectedId] = useState<number | undefined>()
  const [pendingPassiveId, setPendingPassiveId] = useState<number | null>(null)
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedId) ?? sessions[0]
  }, [sessions, selectedId])
  const {
    stats,
    loading: statsLoading,
    reload: reloadStats,
  } = useCaptureStats(activeSession?.id)
  const { run, loading: runningPassive, error: passiveError } = useRunCapture()
  const { finalize, loading: finalizing } = useFinalizeCapture()

  const [passiveForm, setPassiveForm] = useState({ interfaz: "", duracion: "60", filtro: "", origen: "manual" })
  const [advancedFilter, setAdvancedFilter] = useState(false)
  const [passiveBuilder, setPassiveBuilder] = useState({ protocolo: "any", host: "", puerto: "" })
  const [page, setPage] = useState(1)
  const pageSize = 7

  useEffect(() => {
    if (sessions.length && !selectedId) {
      setSelectedId(sessions[0].id)
    }
  }, [sessions, selectedId])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [sessions.length, page, pageSize])

  useEffect(() => {
    if (!pendingPassiveId) return
    const target = sessions.find((session) => session.id === pendingPassiveId)
    if (!target || ["pendiente", "capturando"].includes(target.estado)) {
      return
    }
    setPendingPassiveId(null)
    const estado = target.estado.toLowerCase()
    if (estado === "completada") {
      toast.success(`Captura ${pendingPassiveId} finalizada`, {
        description: "La sesión ya está disponible.",
      })
    } else if (estado === "abortada") {
      toast.info(`Captura ${pendingPassiveId} abortada`)
    } else if (estado === "error") {
      toast.error(`Captura ${pendingPassiveId} falló`, {
        description: target.observaciones || "Revisá los logs para más detalle.",
      })
    }
    if (target.id === activeSession?.id) {
      reloadStats()
    }
  }, [sessions, pendingPassiveId, activeSession?.id, reloadStats])

  useEffect(() => {
    if (!pendingPassiveId) {
      return
    }
    const interval = setInterval(() => {
      reload()
    }, 4000)
    return () => clearInterval(interval)
  }, [pendingPassiveId, reload])

  const passiveFilterPreview = useMemo(() => {
    return passiveForm.filtro.trim() || buildPassiveFilter(passiveBuilder)
  }, [passiveForm.filtro, passiveBuilder])

  const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize))
  const paginatedSessions = useMemo(() => {
    const start = (page - 1) * pageSize
    return sessions.slice(start, start + pageSize)
  }, [sessions, page, pageSize])

  const handlePassiveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const duracion = Number(passiveForm.duracion) || 60
    const interfaz = passiveForm.interfaz.trim()
    const manualFilter = advancedFilter ? passiveForm.filtro.trim() : ""
    const computedFilter = !advancedFilter ? buildPassiveFilter(passiveBuilder) : ""
    const finalFilter = manualFilter || computedFilter || ""
    const result = await run({
      ...(interfaz ? { interfaz } : {}),
      origen: passiveForm.origen,
      filtro_bpf: finalFilter,
      duracion_objetivo: duracion,
    })
    if (result) {
      toast.warning(`Captura ${result.id} en ejecución`, {
        description: "Esperá a que termine para ver los resultados.",
      })
      setPassiveForm((prev) => ({ ...prev, filtro: "" }))
      await reload()
      setSelectedId(result.id)
      setPendingPassiveId(result.id)
    }
  }

  const handleFinalize = async (estado: "completada" | "abortada", sessionId?: number) => {
    const targetId = sessionId ?? activeSession?.id
    if (!targetId) return
    const result = await finalize(targetId, { estado })
    if (result) {
      toast.success(`Sesión ${estado === "completada" ? "finalizada" : "abortada"}`)
      await reload()
      setSelectedId(result.id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Captura de tráfico</h1>
        <p className="text-sm text-muted-foreground">
          Ejecutá capturas pasivas y consultá el historial de sesiones.
        </p>
      </header>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="h-4 w-4" /> Captura pasiva
            </CardTitle>
            <CardDescription>Escucha en la interfaz indicada y agrupa el tráfico observado.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePassiveSubmit}>
              <div className="space-y-2">
                <Label htmlFor="passive-interfaz">Interfaz (opcional)</Label>
                <Input
                  id="passive-interfaz"
                  value={passiveForm.interfaz}
                  onChange={(event) => setPassiveForm((prev) => ({ ...prev, interfaz: event.target.value }))}
                  placeholder="enp7s0"
                />
                <p className="text-xs text-muted-foreground">
                  Dejalo vacío para reutilizar la interfaz reportada por el agente.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="passive-duracion">Duración (s)</Label>
                  <Input
                    id="passive-duracion"
                    type="number"
                    min={10}
                    value={passiveForm.duracion}
                    onChange={(event) => setPassiveForm((prev) => ({ ...prev, duracion: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origen</Label>
                  <Select
                    value={passiveForm.origen}
                    onValueChange={(value) => setPassiveForm((prev) => ({ ...prev, origen: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGINS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Personalizar filtro avanzado</Label>
                  <Switch checked={advancedFilter} onCheckedChange={setAdvancedFilter} />
                </div>
                {advancedFilter ? (
                  <div className="space-y-2">
                    <Textarea
                      id="passive-filtro"
                      placeholder="tcp port 80"
                      value={passiveForm.filtro}
                      onChange={(event) => setPassiveForm((prev) => ({ ...prev, filtro: event.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sintaxis compatible con tcpdump. Ejemplos: <code>tcp port 443</code>,{" "}
                      <code>udp and host 8.8.8.8</code>, <code>not arp</code>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Filtro (Opcional)</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Select
                        value={passiveBuilder.protocolo}
                        onValueChange={(value) => setPassiveBuilder((prev) => ({ ...prev, protocolo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Protocolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Cualquiera</SelectItem>
                          <SelectItem value="tcp">TCP</SelectItem>
                          <SelectItem value="udp">UDP</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Host/IP (opcional)"
                        value={passiveBuilder.host}
                        onChange={(event) => setPassiveBuilder((prev) => ({ ...prev, host: event.target.value }))}
                      />
                      <Input
                        placeholder="Puerto (opcional)"
                        type="number"
                        min={1}
                        max={65535}
                        value={passiveBuilder.puerto}
                        onChange={(event) => setPassiveBuilder((prev) => ({ ...prev, puerto: event.target.value }))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expresión generada: <code>{passiveFilterPreview || "Todos los paquetes"}</code>
                    </p>
                  </div>
                )}
              </div>
              {passiveError ? (
                <p className="text-sm text-destructive" role="alert">
                  {passiveError}
                </p>
              ) : null}
              {pendingPassiveId ? (
                <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                  <span>Captura #{pendingPassiveId} en curso. Esperando resultados...</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleFinalize("abortada", pendingPassiveId)}
                    disabled={finalizing}
                  >
                    Detener captura
                  </Button>
                </div>
              ) : null}
              <Button type="submit" disabled={runningPassive || pendingPassiveId !== null} className="w-full">
                {runningPassive || pendingPassiveId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Capturando...
                  </>
                ) : (
                  "Iniciar captura"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de sesiones</CardTitle>
          <CardDescription>Seleccioná una sesión para revisar su resumen.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando sesiones...
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay capturas registradas.</p>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Interfaz</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Paquetes</TableHead>
                    <TableHead className="text-right">Bytes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.map((session) => {
                    const paquetesDisplay = session.total_paquetes
                    const isSelected = session.id === activeSession?.id
                    return (
                      <TableRow
                        key={session.id}
                        className={cn("cursor-pointer", isSelected && "bg-primary/5 text-primary")}
                        onClick={() => {
                          setSelectedId(session.id)
                          document
                            .getElementById("session-detail")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" })
                          toast.info(`Sesión ${session.id} seleccionada`)
                        }}
                      >
                        <TableCell>{new Date(session.inicio).toLocaleString()}</TableCell>
                        <TableCell>{session.interfaz}</TableCell>
                        <TableCell className="capitalize">{session.estado}</TableCell>
                        <TableCell>{paquetesDisplay}</TableCell>
                        <TableCell className="text-right">{formatBytes(session.total_bytes)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 ? (
                <div className="border-t px-3 py-2">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <SessionDetail
        id="session-detail"
        session={activeSession}
        statsLoading={statsLoading}
        stats={stats}
      />
    </div>
  )
}

function SessionDetail({
  session,
  stats,
  statsLoading,
  id,
}: {
  session?: CaptureSession
  stats: ReturnType<typeof useCaptureStats>["stats"]
  statsLoading: boolean
  id?: string
}) {
  if (!session) {
    return (
      <Card id={id}>
        <CardHeader>
          <CardTitle>Detalle de sesión</CardTitle>
          <CardDescription>Seleccioná una sesión en el panel anterior.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card id={id}>
      <CardHeader>
        <div>
          <CardTitle>Sesión #{session.id}</CardTitle>
          <CardDescription>
            Captura pasiva en {session.interfaz}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Estado" value={session.estado} />
          <Stat label="Inicio" value={new Date(session.inicio).toLocaleString()} />
          <Stat label="Duración objetivo" value={session.duracion_objetivo ? `${session.duracion_objetivo} s` : "N/D"} />
          <Stat label="Total bytes" value={formatBytes(session.total_bytes)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Paquetes" value={session.total_paquetes} />
          <Stat label="Filtro" value={session.filtro_bpf || "Sin filtro"} />
          <Stat
            label="Archivos generados"
            value={`${session.archivos_count} archivos / ${formatBytes(session.total_bytes)}`}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">Estadísticas rápidas</p>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando...
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Hosts únicos" value={stats.hosts_unicos} />
              <Stat label="Puertos únicos" value={stats.puertos_unicos} />
              <Stat
                label="Ancho promedio"
                value={stats.ancho_banda_promedio ? `${stats.ancho_banda_promedio.toFixed(2)} Mbps` : "N/A"}
              />
              <Stat
                label="Ancho pico"
                value={stats.ancho_banda_pico ? `${stats.ancho_banda_pico.toFixed(2)} Mbps` : "N/A"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay estadísticas para esta sesión.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function buildPassiveFilter(builder: { protocolo: string; host: string; puerto: string }) {
  const parts: string[] = []
  if (builder.protocolo !== "any") {
    parts.push(builder.protocolo)
  }
  const host = builder.host.trim()
  if (host) {
    parts.push(`host ${host}`)
  }
  const port = Number(builder.puerto)
  if (port) {
    parts.push(`port ${port}`)
  }
  return parts.join(" and ")
}
