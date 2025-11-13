import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Info, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDevice } from "@/hooks/useDevice"
import { useDeviceHistory } from "@/hooks/useDeviceHistory"

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  desconocido: "Desconocido",
}

export default function DeviceDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const deviceId = Number(params.deviceId)

  const { device, loading, error } = useDevice(Number.isFinite(deviceId) ? deviceId : undefined)
  const {
    entries,
    loading: historyLoading,
    error: historyError,
  } = useDeviceHistory(Number.isFinite(deviceId) ? deviceId : undefined)

  if (!Number.isFinite(deviceId)) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Identificador de dispositivo inválido.</p>
        <Button asChild variant="outline">
          <Link to="/detector/dispositivos">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Button>
            <span>Dispositivo #{deviceId}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{device?.hostname || "Sin hostname"}</h1>
          <p className="text-sm text-muted-foreground">
            Consultá el detalle y el historial de direcciones registradas para este dispositivo.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando dispositivo...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : device ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Registrado por última vez: {formatDate(device.ultima_vez)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusToVariant(device.estado)}>
                  {STATUS_LABELS[device.estado] ?? device.estado}
                </Badge>
                {device.mac_aleatoria ? <Badge variant="secondary">MAC aleatoria</Badge> : null}
                {device.es_temporal ? <Badge variant="outline">Temporal</Badge> : null}
                {device.tipo_dispositivo !== "desconocido" ? (
                  <Badge variant="outline">{formatLabel(device.tipo_dispositivo)}</Badge>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Hostname" value={device.hostname || "Sin datos"} />
                <InfoRow label="IP actual" value={device.ip} />
                <InfoRow label="MAC" value={device.mac} monospace />
                <InfoRow label="Vendor" value={device.vendor || "Sin datos"} />
                <InfoRow
                  label="Sistema operativo"
                  value={device.sistema_operativo || "Sin datos"}
                  tooltip={
                    device.sistema_operativo
                      ? getOsConfidence(device.fuente_fingerprint || device.tipo_fuente)
                      : undefined
                  }
                />
                <InfoRow label="Método de identificación" value={formatLabel(device.metodo_identificacion)} />
                <InfoRow label="Fuente de datos" value={formatLabel(device.tipo_fuente)} />
                <InfoRow label="Hostname (fuente)" value={formatLabel(device.hostname_fuente)} />
                <InfoRow label="MAC aleatoria" value={formatBoolean(device.mac_aleatoria)} />
                <InfoRow label="Temporal" value={formatBoolean(device.es_temporal)} />
                <InfoRow label="Primera vez visto" value={formatDate(device.primera_vez)} />
                <InfoRow label="Última vez visto" value={formatDate(device.ultima_vez)} />
                <InfoRow label="Fuente fingerprint" value={device.fuente_fingerprint || "Sin datos"} />
                <InfoRow
                  label="Última fingerprint"
                  value={device.ultima_fingerprint ? formatDate(device.ultima_fingerprint) : "Sin datos"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Puertos asociados</CardTitle>
              <CardDescription>
                Este bloque mostrará los puertos aprendidos cuando integremos el escáner.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Estamos consolidando los puertos descubiertos por el módulo de escaneo. Muy pronto vas
              a poder verlos acá y exportarlos para documentación.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de IP / MAC</CardTitle>
              <CardDescription>Asignaciones registradas para este dispositivo.</CardDescription>
            </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando historial...
                  </div>
                ) : historyError ? (
                  <p className="text-sm text-destructive">{historyError}</p>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay variaciones registradas.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP actual</TableHead>
                        <TableHead>IP registrada</TableHead>
                        <TableHead>MAC</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, index) => {
                        const ipActual =
                          index === 0 ? device.ip : entries[index - 1]?.ip ?? device.ip
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>{ipActual}</TableCell>
                            <TableCell>{entry.ip}</TableCell>
                            <TableCell className="font-mono text-xs">{entry.mac}</TableCell>
                            <TableCell>{formatDate(entry.inicio)}</TableCell>
                            <TableCell>{entry.fin ? formatDate(entry.fin) : "—"}</TableCell>
                            <TableCell>{formatLabel(entry.motivo)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
        </>
      ) : null}
    </div>
  )
}

function InfoRow({
  label,
  value,
  monospace,
  tooltip,
}: {
  label: string
  value: string
  monospace?: boolean
  tooltip?: string
}) {
  return (
    <div className="flex items-center justify-between rounded border border-border/70 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <span className={monospace ? "font-mono text-sm" : "text-sm font-medium"}>{value}</span>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Ver detalle del dato"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatLabel(value?: string | null) {
  if (!value) return "Sin datos"
  return value
    .replace(/_/g, " ")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getOsConfidence(source?: string | null) {
  const normalized = (source ?? "").toLowerCase()
  switch (normalized) {
    case "manual":
      return "Dato ingresado manualmente (precisión 100%)."
    case "captura":
    case "sniffer":
      return "Estimación ≈85% basada en fingerprints obtenidos durante las capturas."
    case "heuristica":
    case "detector":
      return "Estimación ≈70% basada en heurísticas del detector."
    default:
      return "Usa el dato como referencia, la precisión no es exacta."
  }
}

function statusToVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "activo":
      return "default"
    case "inactivo":
      return "secondary"
    default:
      return "outline"
  }
}

function formatBoolean(value: boolean) {
  return value ? "Sí" : "No"
}
