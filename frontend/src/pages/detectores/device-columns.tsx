import type { Column, ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DetectorDevice } from "@/types/detector"

export type DeviceTableMeta = {
  onView?: (device: DetectorDevice) => void
}

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  desconocido: "Desconocido",
}

export const deviceColumns: ColumnDef<DetectorDevice, unknown>[] = [
  {
    id: "search",
    accessorFn: (row) =>
      [
        row.ip,
        row.mac,
        row.vendor,
        row.sistema_operativo,
        row.estado,
        row.primera_vez,
        row.ultima_vez,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    enableSorting: false,
    enableHiding: true,
    filterFn: (row, columnId, value) => {
      if (!value) return true
      const content = (row.getValue<string>(columnId) || "").toLowerCase()
      return content.includes(String(value).toLowerCase())
    },
  },
  {
    accessorKey: "estado",
    header: ({ column }) => <SortableHeader column={column} label="Estado" />,
    cell: ({ row }) => (
      <Badge variant={statusToVariant(row.original.estado)}>
        {STATUS_LABELS[row.original.estado] ?? row.original.estado}
      </Badge>
    ),
    filterFn: (row, columnId, value) => {
      if (!value || value === "todos") return true
      return row.getValue(columnId) === value
    },
  },
  {
    accessorKey: "mac",
    header: ({ column }) => <SortableHeader column={column} label="MAC" />,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.mac}</span>,
  },
  {
    accessorKey: "ip",
    header: ({ column }) => <SortableHeader column={column} label="IP" />,
  },
  {
    accessorKey: "vendor",
    header: ({ column }) => <SortableHeader column={column} label="Vendor" />,
    cell: ({ row }) => row.original.vendor || "—",
  },
  {
    accessorKey: "sistema_operativo",
    header: ({ column }) => <SortableHeader column={column} label="SO" />,
    cell: ({ row }) => row.original.sistema_operativo || "—",
  },
  {
    accessorKey: "primera_vez",
    header: ({ column }) => <SortableHeader column={column} label="Primera vez" />,
    cell: ({ row }) => formatDate(row.original.primera_vez),
  },
  {
    accessorKey: "ultima_vez",
    header: ({ column }) => <SortableHeader column={column} label="Última vez" />,
    cell: ({ row }) => formatDate(row.original.ultima_vez),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as DeviceTableMeta | undefined
      return (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={(event) => {
            event.stopPropagation()
            meta?.onView?.(row.original)
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )
    },
  },
]

function SortableHeader({ column, label }: { column: Column<DetectorDevice, unknown>; label: string }) {
  return (
    <Button
      variant="ghost"
      className="-ml-2"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
    </Button>
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
