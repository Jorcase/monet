import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCaptureSession } from "@/hooks/useCaptureSession"
import { useCaptureFiles } from "@/hooks/useCaptureFiles"
import { useCaptureStats } from "@/hooks/useCaptureStats"

export default function SessionDetailPage() {
  const params = useParams()
  const sessionId = Number(params.sessionId)
  const navigate = useNavigate()

  const { session, loading, error } = useCaptureSession(Number.isFinite(sessionId) ? sessionId : undefined)
  const { stats, loading: statsLoading } = useCaptureStats(Number.isFinite(sessionId) ? sessionId : undefined)
  const { files, loading: filesLoading } = useCaptureFiles(Number.isFinite(sessionId) ? sessionId : undefined, 20)
  const protocolTop = stats?.protocolos_top ?? {}

  if (!Number.isFinite(sessionId)) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Identificador de sesión inválido.</p>
        <Button variant="outline" onClick={() => navigate("/captura/sesiones")}>
          Volver a sesiones
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando sesión...
      </div>
    )
  }

  if (error || !session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sesión #{sessionId}</CardTitle>
          <CardDescription>{error || "No se encontró la sesión indicada."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate("/captura/sesiones")}>
            Volver a sesiones
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Button>
            <span>Sesión #{session.id}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Detalle de captura</h1>
          <p className="text-sm text-muted-foreground">Revisa los contadores y estadísticas de la sesión.</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {session.estado}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Datos generales y contadores.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Interfaz" value={session.interfaz || "—"} />
          <InfoRow label="Modo" value={session.modo} />
          <InfoRow label="Origen" value={session.origen} />
          <InfoRow label="Estado" value={session.estado} />
          <InfoRow label="Inicio" value={new Date(session.inicio).toLocaleString()} />
          <InfoRow label="Fin" value={session.fin ? new Date(session.fin).toLocaleString() : "En ejecución"} />
          <InfoRow label="Duración objetivo" value={session.duracion_objetivo ? `${session.duracion_objetivo} s` : "N/D"} />
          <InfoRow label="Paquetes" value={session.total_paquetes.toLocaleString()} />
          <InfoRow label="Paquetes descartados" value={session.paquetes_descartados.toLocaleString()} />
          <InfoRow label="Bytes totales" value={formatBytes(session.total_bytes)} />
          <InfoRow label="Filtro BPF" value={session.filtro_bpf || "Sin filtro"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadísticas</CardTitle>
          <CardDescription>Hosts, puertos y protocolos destacados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {statsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando estadísticas...
            </div>
          ) : stats ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoRow label="Hosts únicos" value={stats.hosts_unicos} />
                <InfoRow label="Puertos únicos" value={stats.puertos_unicos} />
                <InfoRow
                  label="Ancho promedio"
                  value={stats.ancho_banda_promedio ? `${stats.ancho_banda_promedio.toFixed(2)} Mbps` : "N/A"}
                />
                <InfoRow
                  label="Ancho pico"
                  value={stats.ancho_banda_pico ? `${stats.ancho_banda_pico.toFixed(2)} Mbps` : "N/A"}
                />
              </div>
              {Object.keys(protocolTop).length ? (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-2">Top protocolos</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(protocolTop).map(([proto, bytes]) => (
                      <Badge key={proto} variant="secondary" className="font-normal">
                        {proto.toUpperCase()}: {formatBytes(Number(bytes))}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay estadísticas calculadas.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archivos generados</CardTitle>
          <CardDescription>PCAPs u otros artefactos de la sesión.</CardDescription>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando archivos...
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se registraron archivos para esta sesión.</p>
          ) : (
            <div className="w-full overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="capitalize">{file.tipo}</TableCell>
                      <TableCell className="truncate max-w-[320px]" title={file.ruta}>
                        {file.ruta}
                      </TableCell>
                      <TableCell>{formatBytes(file.tamano_bytes)}</TableCell>
                      <TableCell className="truncate max-w-[200px]" title={file.hash_archivo}>
                        {file.hash_archivo || "—"}
                      </TableCell>
                      <TableCell>{new Date(file.creado).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
