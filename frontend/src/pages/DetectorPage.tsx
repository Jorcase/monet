import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Loader2, RefreshCw } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Pagination } from "@/components/ui/pagination"
import { useDetectorAnalyses } from "@/hooks/useDetectorAnalyses"
import { useDetectorHosts } from "@/hooks/useDetectorHosts"
import { useRunDetector } from "@/hooks/useRunDetector"
import type { DetectorHost } from "@/types/detector"
import { cn } from "@/lib/utils"

const ARP_MODES = [
  { value: "rapido", label: "ARP rápido" },
  { value: "completo", label: "ARP completo" },
]
const PAGE_SIZE = 5

export default function DetectorPage() {
  const { analyses, loading, error, reload } = useDetectorAnalyses(100)
  const [activeAnalysisId, setActiveAnalysisId] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const activeAnalysis = useMemo(
    () => analyses.find((analysis) => analysis.id === activeAnalysisId) ?? analyses[0],
    [analyses, activeAnalysisId]
  )
  const { hosts, loading: hostsLoading, error: hostsError } = useDetectorHosts({
    analisisId: activeAnalysis?.id,
    limit: 100,
  })
  const { run, loading: running, error: runError } = useRunDetector()
  const [interfaceValue, setInterfaceValue] = useState("")
  const [arpMode, setArpMode] = useState(ARP_MODES[0].value)
  const [fingerprintOs, setFingerprintOs] = useState(false)
  const [selectedHost, setSelectedHost] = useState<DetectorHost | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)
  const hostDetailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (analyses.length > 0 && !activeAnalysisId) {
      setActiveAnalysisId(analyses[0].id)
    }
  }, [analyses, activeAnalysisId])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(analyses.length / PAGE_SIZE))
    setPage((prev) => Math.min(prev, totalPages))
    const currentIndex = analyses.findIndex((analysis) => analysis.id === activeAnalysisId)
    if (currentIndex !== -1) {
      const targetPage = Math.floor(currentIndex / PAGE_SIZE) + 1
      setPage((prev) => (prev === targetPage ? prev : targetPage))
    }
  }, [analyses, activeAnalysisId])

  useEffect(() => {
    if (runError) {
      toast.error(runError)
    }
  }, [runError])

  const handleRun = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const iface = interfaceValue.trim()
    const promise = run(iface || undefined, undefined, fingerprintOs, arpMode)
    toast.promise(promise, {
      loading: "Ejecutando análisis...",
      success: "Análisis completado correctamente",
      error: (message) => message || "No se pudo completar el análisis",
    })
    const result = await promise
    if (result) {
      setInterfaceValue("")
      await reload()
      setActiveAnalysisId(result.id)
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const summary = useMemo(() => {
    if (!activeAnalysis) {
      return { total: 0, duration: "-", date: null, interface: "-" }
    }
    const durationSeconds = activeAnalysis.duracion_ms
      ? `${(activeAnalysis.duracion_ms / 1000).toFixed(1)} s`
      : "N/A"
    return {
      total: activeAnalysis.total_hosts_detectados,
      duration: durationSeconds,
      date: new Date(activeAnalysis.inicio).toLocaleString(),
      interface: activeAnalysis.interfaz,
    }
  }, [activeAnalysis])

  const totalPages = Math.max(1, Math.ceil(analyses.length / PAGE_SIZE))
  const paginatedAnalyses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return analyses.slice(start, start + PAGE_SIZE)
  }, [analyses, page])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detector de hosts</h1>
          <p className="text-sm text-muted-foreground">
            Ejecuta escaneos para descubrir los dispositivos conectados a tu red local.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ejecutar análisis</CardTitle>
            <CardDescription>
              Elija el tipo de escaneo y, si quieres, una interfaz específica.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleRun}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Modo ARP</label>
                <Select value={arpMode} onValueChange={setArpMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ARP_MODES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Interfaz</label>
                <Input
                  placeholder="enp7s0"
                  value={interfaceValue}
                  onChange={(event) => setInterfaceValue(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Si lo dejás vacío, se usará la primera interfaz IPv4 válida.
                </p>
              </div>
              <label className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">Intentar fingerprint activo</p>
                  <p className="text-xs text-muted-foreground">
                    Ejecuta nmap por cada host para estimar el sistema operativo.
                  </p>
                </div>
                <Switch checked={fingerprintOs} onCheckedChange={setFingerprintOs} />
              </label>
              {runError ? (
                <p className="text-sm text-destructive" role="alert">
                  {runError}
                </p>
              ) : null}
              <Button type="submit" disabled={running} className="w-full">
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Detectar hosts
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de análisis</CardTitle>
            <CardDescription>Seleccioná un análisis para ver el detalle.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingMessage text="Cargando historial..." />
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : analyses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay registros.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-4 bg-muted px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
                  <span>Fecha</span>
                  <span>Interfaz</span>
                  <span>Hosts</span>
                  <span>Duración</span>
                </div>
                <div className="divide-y">
                  {paginatedAnalyses.map((analysis) => (
                    <button
                      key={analysis.id}
                      type="button"
                      className={cn(
                        "grid grid-cols-4 px-3 py-2 text-left text-sm",
                        analysis.id === activeAnalysis?.id
                          ? "bg-primary/5 text-primary"
                          : "hover:bg-muted/60"
                      )}
                      onClick={() => {
                        setActiveAnalysisId(analysis.id)
                        setSelectedHost(null)
                        toast.info(`Mostrando análisis del ${new Date(analysis.inicio).toLocaleString()}`)
                        detailRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }}
                    >
                      <span>{new Date(analysis.inicio).toLocaleString()}</span>
                      <span>{analysis.interfaz}</span>
                      <span>{analysis.total_hosts_detectados}</span>
                      <span>
                        {analysis.duracion_ms
                          ? `${(analysis.duracion_ms / 1000).toFixed(1)} s`
                          : "N/A"}
                      </span>
                    </button>
                  ))}
                </div>
                {totalPages > 1 ? (
                  <div className="border-t px-3 py-2">
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del análisis seleccionado</CardTitle>
          <CardDescription>
            {activeAnalysis
              ? `Interfaz ${summary.interface} · ${summary.date}`
              : "Seleccioná un análisis para ver el detalle."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeAnalysis ? (
            <p className="text-sm text-muted-foreground">
              Aún no se seleccionó un análisis.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryStat title="Hosts detectados" value={summary.total} />
                <SummaryStat title="Interfaz" value={summary.interface} />
                <SummaryStat title="Duración" value={summary.duration} />
              </div>
              <div ref={detailRef}>
                <HostTable
                  hosts={hosts}
                  loading={hostsLoading}
                  error={hostsError}
                  onSelectHost={(host) => {
                    setSelectedHost(host)
                    toast.info(`Mostrando host ${host.ip}`)
                    hostDetailRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <HostDetailCard host={selectedHost} ref={hostDetailRef} />
    </div>
  )
}

function LoadingMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  )
}

function SummaryStat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded border px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function HostTable({
  hosts,
  loading,
  error,
  onSelectHost,
}: {
  hosts: DetectorHost[]
  loading: boolean
  error: string | null
  onSelectHost: (host: DetectorHost) => void
}) {
  if (loading) {
    return <LoadingMessage text="Cargando hosts..." />
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!hosts.length) {
    return <p className="text-sm text-muted-foreground">No se detectaron hosts.</p>
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-muted text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th className="w-[28%] px-3 py-2 text-left">MAC</th>
            <th className="w-[18%] px-3 py-2 text-left">IP</th>
            <th className="w-[28%] px-3 py-2 text-left">Hostname</th>
            <th className="w-[18%] px-3 py-2 text-left">Vendor</th>
            <th className="w-[8%] px-3 py-2 text-right">Latencia</th>
          </tr>
        </thead>
        <tbody>
          {hosts.map((host) => (
            <HostRow key={host.id} host={host} onSelectHost={onSelectHost} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HostRow({
  host,
  onSelectHost,
}: {
  host: DetectorHost
  onSelectHost: (host: DetectorHost) => void
}) {
  const device = host.device_info
  return (
    <tr
      className="cursor-pointer border-t border-border/60 first:border-t-0 hover:bg-muted/60 focus-visible:outline-none"
      onClick={() => onSelectHost(host)}
    >
      <td className="px-3 py-2 font-mono text-sm font-medium text-foreground">
        <span className="block truncate">{host.mac || "—"}</span>
      </td>
      <td className="px-3 py-2 font-mono text-sm text-muted-foreground">
        <span className="block truncate">{host.ip}</span>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        <span className="block truncate">{host.hostname || "Sin hostname"}</span>
      </td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        <span className="block truncate">{device?.vendor || "Desconocido"}</span>
      </td>
      <td className="px-3 py-2 text-right text-sm text-muted-foreground">
        {host.latencia_ms !== null ? `${host.latencia_ms} ms` : "N/A"}
      </td>
    </tr>
  )
}

const HostDetailCard = forwardRef<HTMLDivElement, { host: DetectorHost | null }>(
  ({ host }, ref) => {
    if (!host) return null
    const device = host.device_info
    return (
      <Card ref={ref}>
        <CardHeader>
          <CardTitle>Detalle del host</CardTitle>
          <CardDescription>
            Host detectado en el análisis actual. Incluye datos combinados del dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <DetailItem label="MAC" value={host.mac || "—"} />
          <DetailItem label="IP" value={host.ip} />
          <DetailItem label="Hostname" value={host.hostname || "Sin hostname"} />
          <DetailItem label="Vendor" value={device?.vendor || "Desconocido"} />
          <DetailItem
            label="Sistema operativo"
            value={device?.sistema_operativo || "Sin datos"}
          />
          <DetailItem
            label="Latencia"
            value={host.latencia_ms !== null ? `${host.latencia_ms} ms` : "N/A"}
          />
          <DetailItem label="Método detección" value={host.metodo_deteccion.toUpperCase()} />
          <DetailItem
            label="Última vista"
            value={new Date(host.ultima_vista).toLocaleString(undefined, { hour12: false })}
          />
          <DetailItem
            label="Primera vista"
            value={new Date(host.primera_vista).toLocaleString(undefined, { hour12: false })}
          />
          <DetailItem label="Notas" value={host.notas || "Sin notas"} />
          <DetailItem
            label="MAC aleatoria"
            value={device ? (device.mac_aleatoria ? "Sí" : "No") : "N/A"}
          />
          <DetailItem label="Estado dispositivo" value={device?.estado || "N/A"} />
          <DetailItem
            label="Primera vez dispositivo"
            value={
              device
                ? new Date(device.primera_vez).toLocaleString(undefined, { hour12: false })
                : "N/A"
            }
          />
          <DetailItem
            label="Última vez dispositivo"
            value={
              device
                ? new Date(device.ultima_vez).toLocaleString(undefined, { hour12: false })
                : "N/A"
            }
          />
        </CardContent>
      </Card>
    )
  }
)
HostDetailCard.displayName = "HostDetailCard"

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border px-3 py-2">
    <p className="text-xs uppercase text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
)
