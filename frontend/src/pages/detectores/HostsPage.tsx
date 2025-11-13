import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useHostsInventory } from "@/hooks/useHostsInventory"

import { HostsDataTable } from "./HostsDataTable"

export default function HostsPage() {
  const navigate = useNavigate()
  const { hosts, loading, error } = useHostsInventory()

  const handleRowClick = (host: { id: number }) => {
    navigate(`/detector/hosts/${host.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hosts detectados</h1>
          <p className="text-sm text-muted-foreground">
            Explorá todos los hosts vistos por el detector y las capturas.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF (próximamente)
        </Button>
      </div>

      <HostsDataTable data={hosts} loading={loading} error={error} onRowClick={handleRowClick} />
    </div>
  )
}
