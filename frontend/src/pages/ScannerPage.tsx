import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Pagination } from "@/components/ui/pagination"
import { useDevices } from "@/hooks/useDevices"
import { useDetectorAnalyses } from "@/hooks/useDetectorAnalyses"
import { useScannerJobs } from "@/hooks/useScannerJobs"
import { useScannerPorts } from "@/hooks/useScannerPorts"
import { useRunScanner } from "@/hooks/useRunScanner"
import type { ScannerJob } from "@/types/scanner"

const SCAN_TYPES = [
  { value: "rapido", label: "Top 100 puertos" },
  { value: "tcp-1000", label: "TCP primeros 1000" },
  { value: "tcp-completo", label: "TCP completo" },
  { value: "personalizado", label: "Personalizado" },
]

const JOB_STATE_VARIANTS: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  pendiente: "secondary",
  ejecutando: "secondary",
  completado: "default",
  error: "destructive",
}

export default function ScannerPage() {
  const navigate = useNavigate()
  const { devices } = useDevices()
  const activeDevices = useMemo(
    () => devices.filter((device) => device.estado === "activo" && device.ip),
    [devices]
  )
  const detailRef = useRef<HTMLDivElement | null>(null)
  const JOBS_PER_PAGE = 8
  const { analyses } = useDetectorAnalyses(6)
  const {
    jobs,
    loading: jobsLoading,
    error: jobsError,
    reload: reloadJobs,
    setJobs,
  } = useScannerJobs()
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [jobsPage, setJobsPage] = useState(1)
  const [manualEnabled, setManualEnabled] = useState(false)
  const [devicesEnabled, setDevicesEnabled] = useState(false)
  const [analysisEnabled, setAnalysisEnabled] = useState(false)
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null)
  const [pendingJobId, setPendingJobId] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id)
    }
  }, [jobs, selectedJobId])

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  )
  useEffect(() => {
    if (!selectedJobId) return
    const index = jobs.findIndex((job) => job.id === selectedJobId)
    if (index === -1) return
    const targetPage = Math.floor(index / JOBS_PER_PAGE) + 1
    setJobsPage((prev) => (prev === targetPage ? prev : targetPage))
  }, [jobs, selectedJobId])

  const totalJobPages = Math.max(1, Math.ceil(jobs.length / JOBS_PER_PAGE))
  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * JOBS_PER_PAGE
    return jobs.slice(start, start + JOBS_PER_PAGE)
  }, [jobs, jobsPage])

  const portFilters = useMemo(
    () => (selectedJob ? { trabajo_id: selectedJob.id } : undefined),
    [selectedJob]
  )
  const {
    ports,
    loading: portsLoading,
    error: portsError,
    reload: reloadPorts,
  } = useScannerPorts(portFilters)
  const { run, loading: runningScan, error: runError } = useRunScanner()

  const [manualTargets, setManualTargets] = useState("")
  const [selectedDeviceIps, setSelectedDeviceIps] = useState<string[]>([])
  const [includeLocal, setIncludeLocal] = useState(false)
  const [includeAllActive, setIncludeAllActive] = useState(false)
  const [scanType, setScanType] = useState(SCAN_TYPES[0].value)
  const [customPorts, setCustomPorts] = useState("")

  const parsedTargets = useMemo(() => {
    return manualTargets
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }, [manualTargets])

  const handleToggleDevice = (ip: string) => {
    setSelectedDeviceIps((prev) =>
      prev.includes(ip) ? prev.filter((item) => item !== ip) : [...prev, ip]
    )
  }

  useEffect(() => {
    if (!analysisEnabled) {
      setSelectedAnalysisId(null)
    }
  }, [analysisEnabled])

  useEffect(() => {
    if (!devicesEnabled) {
      setSelectedDeviceIps([])
      setIncludeAllActive(false)
    }
  }, [devicesEnabled])

  const hasRunningJobs = useMemo(
    () => jobs.some((job) => job.estado === "pendiente" || job.estado === "ejecutando"),
    [jobs]
  )
  const selectedJobRunning = selectedJob
    ? selectedJob.estado === "pendiente" || selectedJob.estado === "ejecutando"
    : false
  const shouldPoll = hasRunningJobs || selectedJobRunning || pendingJobId !== null

  useEffect(() => {
    if (!shouldPoll) {
      return
    }
    const timer = setInterval(() => {
      reloadJobs()
      if (selectedJobId) {
        reloadPorts()
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [shouldPoll, reloadJobs, reloadPorts, selectedJobId])

  useEffect(() => {
    if (!pendingJobId) return
    const target = jobs.find((job) => job.id === pendingJobId)
    if (!target) return
    if (target.estado === "pendiente" || target.estado === "ejecutando") {
      return
    }
    setPendingJobId(null)
    if (target.estado === "completado") {
      toast.success(`Escaneo #${target.id} finalizado`, {
        description: "Los puertos detectados ya están disponibles.",
      })
    } else if (target.estado === "error") {
      toast.error(`Escaneo #${target.id} falló`, {
        description: target.notas || "Revisá los registros para más detalle.",
      })
    }
    if (selectedJobId === target.id) {
      reloadPorts()
    }
  }, [jobs, pendingJobId, reloadPorts, selectedJobId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const hasManualTargets = manualEnabled && parsedTargets.length > 0
    const hasDeviceTargets = devicesEnabled && (includeAllActive || selectedDeviceIps.length > 0)
    const hasAnalysisTarget = analysisEnabled && !!selectedAnalysisId
    if (!hasManualTargets && !hasDeviceTargets && !hasAnalysisTarget && !includeLocal) {
      toast.error("Seleccioná al menos un objetivo (IPs, dispositivos, análisis o host local).")
      return
    }
    const payloadTargets = [
      ...(hasManualTargets ? parsedTargets : []),
      ...(devicesEnabled ? selectedDeviceIps : []),
    ]
    const uniqueTargets = Array.from(new Set(payloadTargets))
    const analysisIdsPayload =
      analysisEnabled && selectedAnalysisId ? [selectedAnalysisId] : []
    const payload = {
      include_local: includeLocal,
      include_active_devices: devicesEnabled && includeAllActive,
      targets: uniqueTargets,
      analisis_ids: analysisIdsPayload,
      ...(analysisEnabled && selectedAnalysisId ? { analisis_id: selectedAnalysisId } : {}),
      tipo: scanType,
      ...(scanType === "personalizado" && customPorts ? { puertos: customPorts.trim() } : {}),
    }
    const tempId = Date.now() * -1
    const tempJob: ScannerJob = {
      id: tempId,
      objetivo: buildObjectivePreview(uniqueTargets, {
        includeLocal,
        includeAllActive,
        analysisId: analysisEnabled ? selectedAnalysisId : null,
      }),
      tipo_scan: scanType,
      estado: "ejecutando",
      inicio: new Date().toISOString(),
      fin: null,
      notas: "Escaneo en progreso...",
    }
    setJobs((prev) => [tempJob, ...prev])
    setSelectedJobId(tempId)

    const loadingToast = toast.loading("Preparando escaneo...")
    try {
      const createdJob = await run(payload)
      toast.dismiss(loadingToast)
      toast.warning(`Escaneo #${createdJob.id} en ejecución`, {
        description: "Esperá a que finalice para ver los resultados.",
      })
      setManualTargets("")
      setSelectedDeviceIps([])
      setSelectedAnalysisId(null)
      setIncludeLocal(false)
      if (scanType === "personalizado") {
        setCustomPorts("")
      }
      setJobsPage(1)
      setJobs((prev) => [
        createdJob,
        ...prev.filter((job) => job.id !== tempId && job.id !== createdJob.id),
      ])
      setSelectedJobId(createdJob.id)
      setPendingJobId(createdJob.id)
      await reloadJobs()
    } catch (error) {
      toast.error(parseRunError(error) ?? "No se pudo iniciar el escaneo.", {
        id: loadingToast,
      })
      setJobs((prev) => prev.filter((job) => job.id !== tempId))
      return
    }
  }

  const isSubmitDisabled = runningScan || pendingJobId !== null

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escáner de puertos</h1>
          <p className="text-sm text-muted-foreground">
            Elegí los objetivos, el tipo de escaneo y revisá el historial de trabajos y puertos.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF (próximamente)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejecutar escaneo</CardTitle>
          <CardDescription>Combiná distintos objetivos y elegí el tipo de escaneo a ejecutar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border/70 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={devicesEnabled}
                    onCheckedChange={() => setDevicesEnabled((prev) => !prev)}
                  />
                  Escanear dispositivos activos
                </label>
                {devicesEnabled ? (
                  <>
                    {activeDevices.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay dispositivos activos en este momento.
                      </p>
                    ) : (
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-3">
                        {activeDevices.map((device) => (
                          <label key={device.id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={selectedDeviceIps.includes(device.ip)}
                              onCheckedChange={() => handleToggleDevice(device.ip)}
                            />
                            <span className="truncate">
                              {device.hostname || device.ip} ({device.ip})
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={includeAllActive}
                        onCheckedChange={() => setIncludeAllActive((prev) => !prev)}
                      />
                      Escanear automáticamente todos los activos
                    </label>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Activá esta opción para elegir dispositivos detectados recientemente.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/70 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={analysisEnabled}
                    onCheckedChange={() => setAnalysisEnabled((prev) => !prev)}
                  />
                  Escanear hosts de un análisis reciente
                </label>
                {analysisEnabled ? (
                  <>
                    {analyses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aún no hay análisis disponibles.</p>
                    ) : (
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-3">
                        {analyses.map((analysis) => (
                          <label key={analysis.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="analysis"
                              className="h-4 w-4"
                              checked={selectedAnalysisId === analysis.id}
                              onChange={() => setSelectedAnalysisId(analysis.id)}
                            />
                            <span className="truncate">
                              #{analysis.id} · {new Date(analysis.inicio).toLocaleString()}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    {selectedAnalysisId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedAnalysisId(null)}
                      >
                        Quitar selección
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Activá esta opción para reutilizar los hosts detectados en un análisis.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border/70 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={manualEnabled}
                  onCheckedChange={() => setManualEnabled((prev) => !prev)}
                />
                Ingresar IPs o rangos manualmente
              </label>
              {manualEnabled ? (
                <>
                  <Textarea
                    id="manualTargets"
                    placeholder="Ej: 192.168.0.10, 192.168.0.20/30"
                    value={manualTargets}
                    onChange={(event) => setManualTargets(event.target.value)}
                    className="min-h-[96px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separá por comas o saltos de línea. También podés indicar rangos CIDR.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Activá esta opción para escribir IPs específicas.</p>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
              <div className="space-y-2">
                <Label>Tipo de escaneo</Label>
                <Select value={scanType} onValueChange={setScanType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={includeLocal} onCheckedChange={() => setIncludeLocal((prev) => !prev)} />
                  Incluir host local (127.0.0.1)
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customPorts">Puertos personalizados</Label>
                <Input
                  id="customPorts"
                  disabled={scanType !== "personalizado"}
                  placeholder="Ej: 22,80,443,8000-8100"
                  value={customPorts}
                  onChange={(event) => setCustomPorts(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Utilizá comas o rangos (ej. 20-25). Solo obligatorio si el tipo es personalizado.
                </p>
              </div>
            </div>
            {runError ? <p className="text-sm text-destructive">{runError}</p> : null}
            <Button type="submit" disabled={isSubmitDisabled} className="w-full sm:w-auto">
              {runningScan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ejecutando...
                </>
              ) : pendingJobId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Esperando resultados...
                </>
              ) : (
                "Iniciar escaneo"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de trabajos</CardTitle>
          <CardDescription>Escaneos recientes y su estado actual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando trabajos...
            </div>
          ) : jobsError ? (
            <p className="text-sm text-destructive">{jobsError}</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay trabajos registrados.</p>
          ) : (
            <>
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className={job.id === selectedJobId ? "bg-muted/40" : "cursor-pointer"}
                      onClick={() => {
                        setSelectedJobId(job.id)
                        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                    >
                      <TableCell className="font-medium">#{job.id}</TableCell>
                      <TableCell className="truncate max-w-[220px]">{job.objetivo}</TableCell>
                      <TableCell>{renderScanType(job.tipo_scan)}</TableCell>
                      <TableCell>
                        <Badge variant={JOB_STATE_VARIANTS[job.estado] ?? "outline"}>
                          {job.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(job.inicio)}</TableCell>
                      <TableCell>{job.fin ? formatDate(job.fin) : "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {job.notas || "Sin notas"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalJobPages > 1 ? (
              <div className="flex justify-end">
                <Pagination page={jobsPage} totalPages={totalJobPages} onChange={setJobsPage} />
              </div>
            ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card id="job-detail" ref={detailRef}>
        <CardHeader>
          <CardTitle>Detalle del trabajo</CardTitle>
          <CardDescription>
            {selectedJob ? `Información del trabajo #${selectedJob.id}` : "Seleccioná un trabajo para ver sus detalles."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedJob ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Objetivo" value={selectedJob.objetivo} />
              <InfoRow label="Tipo" value={renderScanType(selectedJob.tipo_scan)} />
              <InfoRow label="Estado" value={selectedJob.estado} />
              <InfoRow label="Inicio" value={formatDate(selectedJob.inicio)} />
              <InfoRow label="Fin" value={selectedJob.fin ? formatDate(selectedJob.fin) : "En curso"} />
              <InfoRow label="Notas" value={selectedJob.notas || "Sin notas"} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ningún trabajo seleccionado.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Puertos detectados</CardTitle>
            <CardDescription>
              {selectedJob
                ? `Puertos encontrados en el trabajo #${selectedJob.id} (ejecutado ${formatDate(selectedJob.inicio)})`
                : "Seleccioná un trabajo para ver sus puertos detectados."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando puertos...
              </div>
            ) : portsError ? (
              <p className="text-sm text-destructive">{portsError}</p>
            ) : ports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin puertos para el trabajo seleccionado.</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Host</TableHead>
                      <TableHead>Puerto</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Detectado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ports.map((port) => (
                      <TableRow
                        key={port.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/escaner/puertos/${port.id}`)}
                      >
                        <TableCell>{port.host_ip}</TableCell>
                        <TableCell>{port.puerto}</TableCell>
                        <TableCell>{port.protocolo.toUpperCase()}</TableCell>
                        <TableCell>{port.servicio || "—"}</TableCell>
                        <TableCell>{port.estado}</TableCell>
                        <TableCell>{formatDate(port.detected_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function renderScanType(value: string) {
  return SCAN_TYPES.find((type) => type.value === value)?.label ?? value
}

function parseRunError(err: unknown) {
  if (!err || typeof err !== "object" || !("payload" in err)) {
    return null
  }
  const payload = (err as { payload?: unknown }).payload
  if (payload && typeof payload === "object" && "detail" in payload) {
    return String(payload.detail)
  }
  return null
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 p-3 text-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function buildObjectivePreview(
  targets: string[],
  opts: { includeLocal: boolean; includeAllActive: boolean; analysisId: number | null }
) {
  const pieces: string[] = []
  if (targets.length > 0) {
    pieces.push(targets.join(", "))
  }
  if (opts.includeAllActive) {
    pieces.push("Dispositivos activos")
  }
  if (opts.includeLocal) {
    pieces.push("Host local")
  }
  if (opts.analysisId) {
    pieces.push(`Análisis #${opts.analysisId}`)
  }
  return pieces.length > 0 ? pieces.join(" · ") : "Escaneo en preparación"
}
