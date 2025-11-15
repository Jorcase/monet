import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import type { ScannerPort } from "@/types/scanner"

const STATE_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  abierto: "default",
  filtrado: "secondary",
  cerrado: "secondary",
  error: "destructive",
}

export type PortTableMeta = {
  onView?: (port: ScannerPort) => void
}

export const portColumns: ColumnDef<ScannerPort>[] = [
  {
    id: "search",
    accessorFn: (row) =>
      `${row.host_ip} ${row.servicio ?? ""} ${row.trabajo?.id ?? ""} ${row.trabajo?.objetivo ?? ""} ${row.protocolo}`,
    enableHiding: true,
  },
  {
    id: "trabajo",
    header: "# Trabajo",
    accessorFn: (row) => row.trabajo?.id ?? "",
    cell: ({ row }) =>
      row.original.trabajo ? (
        <span className="font-medium text-primary">#{row.original.trabajo.id}</span>
      ) : (
        "—"
      ),
    sortingFn: (a, b) => {
      const left = Number(a.original.trabajo?.id ?? 0)
      const right = Number(b.original.trabajo?.id ?? 0)
      return left === right ? 0 : left > right ? 1 : -1
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue) return true
      const value = String(row.getValue(columnId) ?? "")
      return value.includes(String(filterValue))
    },
  },
  {
    accessorKey: "host_ip",
    header: "Host",
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
  },
  {
    accessorKey: "puerto",
    header: "Puerto",
    cell: ({ getValue }) => getValue<number>(),
    enableSorting: true,
  },
  {
    accessorKey: "protocolo",
    header: "Protocolo",
    cell: ({ getValue }) => getValue<string>().toUpperCase(),
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === "todos") {
        return true
      }
      const value = String(row.getValue(columnId) ?? "").toLowerCase()
      return value === filterValue
    },
  },
  {
    accessorKey: "servicio",
    header: "Servicio",
    cell: ({ getValue }) => getValue<string>() || "—",
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ getValue }) => {
      const value = String(getValue<string>())
      return (
        <Badge variant={STATE_VARIANTS[value] ?? "secondary"} className="font-normal capitalize">
          {value}
        </Badge>
      )
    },
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === "todos") {
        return true
      }
      const value = String(row.getValue(columnId) ?? "")
      return value === filterValue
    },
  },
  {
    accessorKey: "detected_at",
    header: "Detectado",
    cell: ({ getValue }) => formatDate(getValue<string>()),
    enableSorting: true,
  },
]

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
