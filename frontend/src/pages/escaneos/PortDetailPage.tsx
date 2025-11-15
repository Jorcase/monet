import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useScannerPort } from "@/hooks/useScannerPort"

export default function PortDetailPage() {
  const params = useParams<{ portId: string }>()
  const navigate = useNavigate()
  const portId = Number(params.portId)
  const isValidId = !Number.isNaN(portId)
  const { port, loading, error, reload } = useScannerPort(isValidId ? portId : undefined)

  const handleBack = () => navigate(-1)

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Puerto #{isValidId ? portId : "desconocido"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Detalle del puerto detectado y del trabajo al que pertenece.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
            Volver
          </Button>
          <Button variant="outline" disabled className="w-full sm:w-auto">
            Exportar PDF (próximamente)
          </Button>
        </div>
      </div>

      {!isValidId ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            El identificador proporcionado no es válido.
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando información del puerto...
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={reload}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : !port ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No se encontró información para este puerto.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>Detalles del host y el puerto detectado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem label="Host" value={port.host_ip} />
                <InfoItem label="Puerto" value={String(port.puerto)} />
                <InfoItem
                  label="Protocolo"
                  value={<Badge variant="secondary">{port.protocolo.toUpperCase()}</Badge>}
                />
                <InfoItem label="Servicio" value={port.servicio || "Desconocido"} />
                <InfoItem
                  label="Estado"
                  value={
                    <Badge variant="outline" className="capitalize">
                      {port.estado}
                    </Badge>
                  }
                />
                <InfoItem label="Fecha detección" value={formatDate(port.detected_at)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trabajo asociado</CardTitle>
              <CardDescription>
                Información del escaneo que detectó este puerto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {port.trabajo ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoItem label="Trabajo" value={`#${port.trabajo.id}`} />
                  <InfoItem label="Objetivo" value={port.trabajo.objetivo} />
                  <InfoItem label="Tipo de escaneo" value={port.trabajo.tipo_scan} />
                  <InfoItem label="Estado" value={port.trabajo.estado} />
                  <InfoItem label="Inicio" value={formatDate(port.trabajo.inicio)} />
                  <InfoItem
                    label="Fin"
                    value={port.trabajo.fin ? formatDate(port.trabajo.fin) : "En ejecución"}
                  />
                  <InfoItem label="Notas" value={port.trabajo.notas || "Sin notas"} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este puerto no tiene un trabajo asociado registrado.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border border-border/60 p-3 text-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
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
