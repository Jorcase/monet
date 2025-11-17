import type { Column, ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CaptureFlow } from "@/types/capture"

export type FlowTableMeta = {
  onView?: (flow: CaptureFlow) => void
}

export const flowColumns: ColumnDef<CaptureFlow, unknown>[] = [
  {
    id: "search",
    accessorFn: (row) =>
      [
        row.src_ip,
        row.dst_ip,
        row.proto_aplicacion,
        row.protocolo,
        row.sni,
        row.categoria_dominio,
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
    accessorKey: "ventana_inicio",
    header: ({ column }) => <SortableHeader column={column} label="Tiempo" />,
    cell: ({ row }) => (
      <span className="text-xs">{formatDate(row.original.ventana_inicio)}</span>
    ),
  },
  {
    accessorKey: "src_ip",
    header: ({ column }) => <SortableHeader column={column} label="Origen" />,
  },
  {
    accessorKey: "dst_ip",
    header: ({ column }) => <SortableHeader column={column} label="Destino" />,
  },
  {
    accessorKey: "proto_aplicacion",
    header: ({ column }) => <SortableHeader column={column} label="App" />,
    filterFn: (row, columnId, value) => {
      if (!value || value === "todos") return true
      const app = (row.getValue<string>(columnId) || "").toLowerCase()
      const protoBase = (row.original.protocolo || "").toLowerCase()
      return app === value || protoBase === value
    },
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-xs capitalize">
        <span>{row.original.proto_aplicacion || row.original.protocolo}</span>
        {row.original.es_doh_dot ? <Badge variant="outline">DoH/DoT</Badge> : null}
      </div>
    ),
  },
  {
    accessorKey: "sni",
    header: ({ column }) => <SortableHeader column={column} label="Dominio / SNI" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-xs">
        <span className="max-w-[200px] truncate leading-tight">{row.original.sni || "—"}</span>
        {row.original.categoria_dominio ? (
          <Badge variant="secondary">{row.original.categoria_dominio}</Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "bytes",
    header: ({ column }) => <SortableHeader column={column} label="Bytes" />,
    cell: ({ row }) => row.original.bytes.toLocaleString(),
  },
]

function SortableHeader({ column, label }: { column: Column<CaptureFlow, unknown>; label: string }) {
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
