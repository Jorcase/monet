import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useDevices } from "@/hooks/useDevices"

import { DevicesDataTable } from "./DevicesDataTable"

export default function DevicesPage() {
  const navigate = useNavigate()
  const { devices, loading, error } = useDevices()

  const handleRowClick = (device: { id: number }) => {
    navigate(`/detector/dispositivos/${device.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispositivos detectados</h1>
          <p className="text-sm text-muted-foreground">
            Inventario consolidado de todos los dispositivos.
          </p>
        </div>
        <Button variant="outline" disabled className="w-full sm:w-auto">
          Exportar PDF 
        </Button>
      </div>
      <DevicesDataTable
        data={devices}
        loading={loading}
        onRowClick={handleRowClick}
        error={error}
      />
    </div>
  )
}
