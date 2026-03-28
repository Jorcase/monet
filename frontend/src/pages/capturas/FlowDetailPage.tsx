import { useLocation, useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CaptureFlow } from "@/types/capture"

export default function FlowDetailPage() {
  const { flowId } = useParams<{ flowId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const flow = (location.state as { flow?: CaptureFlow })?.flow

  if (!flow) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Flujo no disponible</CardTitle>
            <CardDescription>
              No se pudo cargar el detalle. Vuelve a la lista de paquetes y selecciona un flujo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/captura/paquetes")}>Volver a paquetes</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Flujo #{flowId}</h1>
          <p className="text-sm text-muted-foreground">
            Detalle del flujo capturado con metadatos L7.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/captura/paquetes")}>
          Volver a paquetes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Metadatos de red y aplicación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Detail label="Dirección">
              {flow.src_ip}:{flow.src_port ?? "—"} → {flow.dst_ip}:{flow.dst_port ?? "—"}
            </Detail>
            <Detail label="Protocolo">
              {flow.protocolo.toUpperCase()} · {flow.proto_aplicacion || "—"}
              {flow.es_doh_dot ? (
                <Badge className="ml-2" variant="outline">
                  DoH/DoT
                </Badge>
              ) : null}
            </Detail>
            <Detail label="MAC origen">{flow.src_mac || "—"}</Detail>
            <Detail label="MAC destino">{flow.dst_mac || "—"}</Detail>
            <Detail label="Ventana (inicio / fin)">
              {flow.ventana_inicio || "—"} {flow.ventana_fin ? `→ ${flow.ventana_fin}` : ""}
            </Detail>
            <Detail label="Categoría">{flow.categoria_dominio || "—"}</Detail>
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-2">
            <Detail label="SNI / Host">{flow.sni || "—"}</Detail>
            <Detail label="Paquetes / Bytes">
              {flow.paquetes} pkt · {flow.bytes.toLocaleString()} bytes
            </Detail>
            <Detail label="Flags TCP">
              SYN {flow.flag_syn ? "✓" : "—"} · FIN {flow.flag_fin ? "✓" : "—"} · RST{" "}
              {flow.flag_rst ? "✓" : "—"}
            </Detail>
            <Detail label="TTL promedio">{flow.ttl_promedio ?? "—"}</Detail>
            <Detail label="Ventana TCP promedio">{flow.tcp_window_promedio ?? "—"}</Detail>
            <Detail label="TCP MSS">{flow.tcp_mss ?? "—"}</Detail>
            <Detail label="Opciones TCP">{flow.tcp_opciones || "—"}</Detail>
          </div>

          <Separator />

          <Detail label="Dirección">
            {flow.dispositivo_origen ? (
              <>
                #{flow.dispositivo_origen.id} · {flow.dispositivo_origen.hostname || flow.dispositivo_origen.ip || "—"}
              </>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Dispositivo destino">
            {flow.dispositivo_destino ? (
              <>
                #{flow.dispositivo_destino.id} ·{" "}
                {flow.dispositivo_destino.hostname || flow.dispositivo_destino.ip || "—"}
              </>
            ) : (
              "—"
            )}
          </Detail>
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{children}</div>
    </div>
  )
}
