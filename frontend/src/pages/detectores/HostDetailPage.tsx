import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useHost } from "@/hooks/useHost"
import { useHostHistory } from "@/hooks/useHostHistory"

const METHOD_LABELS: Record<string, string> = {
  arp: "ARP",
  ping: "Ping",
  nmap: "Nmap",
  passive: "Pasivo",
  otro: "Otro",
}

export default function HostDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const hostId = Number(params.hostId)

  const { host, loading, error } = useHost(Number.isFinite(hostId) ? hostId : undefined)
  const { entries, loading: historyLoading, error: historyError } = useHostHistory({
    mac: host?.mac || undefined,
    ip: host?.ip || undefined,
  })

  if (!Number.isFinite(hostId)) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Identificador de host inválido.</p>
        <Button asChild variant="outline">
          <Link to="/detector/hosts">Volver al listado</Link>
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
            <span>Host #{hostId}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{host?.hostname || host?.ip || "Host"}</h1>
          <p className="text-sm text-muted-foreground">Detalle del host detectado por el módulo.</p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF
        </Button>
      </div>

  {loading ? (
    <Card>
      <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando host...
      </CardContent>
    </Card>
  ) : error ? (
    <Card>
      <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
    </Card>
  ) : host ? (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
          <CardDescription>Última vez visto: {formatDate(host.ultima_vista)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {METHOD_LABELS[host.metodo_deteccion] ?? host.metodo_deteccion}
            </Badge>
            {host.latencia_ms != null ? (
              <Badge variant="secondary">{host.latencia_ms} ms</Badge>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Hostname" value={host.hostname || "Sin datos"} />
            <InfoRow label="IP" value={host.ip} />
            <InfoRow label="MAC" value={host.mac || "Sin datos"} monospace />
            <InfoRow label="Método" value={METHOD_LABELS[host.metodo_deteccion] ?? host.metodo_deteccion} />
            <InfoRow
              label="Latencia"
              value={host.latencia_ms != null ? `${host.latencia_ms} ms` : "Sin datos"}
            />
            <InfoRow label="Primera vista" value={formatDate(host.primera_vista)} />
            <InfoRow label="Última vista" value={formatDate(host.ultima_vista)} />
            <InfoRow label="Notas" value={host.notas || "Sin notas"} />
          </div>
        </CardContent>
      </Card>

      {host.device_info ? (
        <Card>
          <CardHeader>
            <CardTitle>Dispositivo asociado</CardTitle>
            <CardDescription>Crear la correspondencia con el inventario de dispositivos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={host.device_info.estado === "activo" ? "default" : "secondary"}>
                {host.device_info.estado}
              </Badge>
              {host.device_info.mac_aleatoria ? (
                <Badge variant="outline">MAC aleatoria</Badge>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Vendor" value={host.device_info.vendor || "Sin datos"} />
              <InfoRow label="Primera vez" value={formatDate(host.device_info.primera_vez)} />
              <InfoRow label="Última vez" value={formatDate(host.device_info.ultima_vez)} />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/detector/dispositivos/${host.device_info?.id}`)}
              >
                Ver dispositivo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Historial de apariciones</CardTitle>
          <CardDescription>Ocurrencias recientes del host en los análisis.</CardDescription>
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
            <p className="text-sm text-muted-foreground">Sin apariciones adicionales registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Latencia</TableHead>
                  <TableHead>Primera vista</TableHead>
                  <TableHead>Última vista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.ip}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.mac || "—"}</TableCell>
                    <TableCell>{METHOD_LABELS[entry.metodo_deteccion] ?? entry.metodo_deteccion}</TableCell>
                    <TableCell>{entry.latencia_ms != null ? `${entry.latencia_ms} ms` : "N/A"}</TableCell>
                    <TableCell>{formatDate(entry.primera_vista)}</TableCell>
                    <TableCell>{formatDate(entry.ultima_vista)}</TableCell>
                  </TableRow>
                ))}
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
}: {
  label: string
  value: string
  monospace?: boolean
}) {
  return (
    <div className="rounded border border-border/70 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={monospace ? "font-mono text-sm" : "text-sm font-medium"}>{value}</p>
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
