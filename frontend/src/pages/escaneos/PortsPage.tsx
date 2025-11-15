import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useScannerPorts } from "@/hooks/useScannerPorts"

import { PortsDataTable } from "./PortsDataTable"

const LIMIT_OPTIONS = [
  { label: "200 registros", value: 200 },
  { label: "500 registros", value: 500 },
  { label: "1000 registros", value: 1000 },
]

export default function PortsPage() {
  const navigate = useNavigate()
  const [limit, setLimit] = useState(200)
  const queryParams = useMemo(() => ({ limit }), [limit])
  const { ports, loading, error } = useScannerPorts(queryParams)

  const handleRowClick = (port: { id: number }) => {
    navigate(`/escaner/puertos/${port.id}`)
  }

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Puertos detectados</h1>
          <p className="text-sm text-muted-foreground">
            Explorá todos los puertos descubiertos por los trabajos del escáner.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase text-muted-foreground">Registros a mostrar</span>
            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Cantidad" />
              </SelectTrigger>
              <SelectContent>
                {LIMIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" disabled className="w-full sm:w-auto">
            Exportar PDF (próximamente)
          </Button>
        </div>
      </div>

      <PortsDataTable data={ports} loading={loading} error={error} onRowClick={handleRowClick} />
    </div>
  )
}
