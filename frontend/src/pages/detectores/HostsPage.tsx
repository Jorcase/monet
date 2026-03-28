import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useHostsInventory } from "@/hooks/useHostsInventory"

import { HostsDataTable } from "./HostsDataTable"

export default function HostsPage() {
  const navigate = useNavigate()
  const { hosts, loading, error } = useHostsInventory()

  const handleRowClick = (host: { id: number }) => {
    navigate(`/detector/hosts/${host.id}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hosts detectados</h1>
          <p className="text-sm text-muted-foreground">
            Explora todos los hosts vistos por el detector y las capturas.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF 
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Listado</CardTitle>
          <CardDescription>Hosts observados en escaneos y capturas.</CardDescription>
        </CardHeader>
        <CardContent>
          <HostsDataTable data={hosts} loading={loading} error={error} onRowClick={handleRowClick} />
        </CardContent>
      </Card>
    </div>
  )
}
