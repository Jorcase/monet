import type { Column, ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { DetectorHost } from "@/types/detector"

export type HostTableMeta = {
  onView?: (host: DetectorHost) => void
}

const METHOD_LABELS: Record<string, string> = {
  arp: "ARP",
  ping: "Ping",
  nmap: "Nmap",
  passive: "Pasivo",
  otro: "Otro",
}

export const hostColumns: ColumnDef<DetectorHost, unknown>[] = [
  {
    id: "search",
    accessorFn: (row) =>
      [row.hostname, row.ip, row.mac, row.metodo_deteccion, row.notas]
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
    accessorKey: "hostname",
    header: ({ column }) => <SortableHeader column={column} label="Hostname" />,
    cell: ({ row }) => row.original.hostname || "Sin hostname",
  },
  {
    accessorKey: "ip",
    header: ({ column }) => <SortableHeader column={column} label="IP" />,
  },
  {
    accessorKey: "mac",
    header: ({ column }) => <SortableHeader column={column} label="MAC" />,
    cell: ({ row }) => (row.original.mac ? <span className="font-mono text-xs">{row.original.mac}</span> : "—"),
  },
  {
    accessorKey: "metodo_deteccion",
    header: ({ column }) => <SortableHeader column={column} label="Método" />,
    cell: ({ row }) => (
      <Badge variant="outline">{METHOD_LABELS[row.original.metodo_deteccion] ?? row.original.metodo_deteccion}</Badge>
    ),
    filterFn: (row, columnId, value) => {
      if (!value || value === "todos") return true
      return row.getValue(columnId) === value
    },
  },
  {
    accessorKey: "latencia_ms",
    header: ({ column }) => <SortableHeader column={column} label="Latencia" />,
    cell: ({ row }) => (row.original.latencia_ms != null ? `${row.original.latencia_ms} ms` : "N/A"),
  },
  {
    accessorKey: "primera_vista",
    header: ({ column }) => <SortableHeader column={column} label="Primera vez" />,
    cell: ({ row }) => formatDate(row.original.primera_vista),
  },
  {
    accessorKey: "ultima_vista",
    header: ({ column }) => <SortableHeader column={column} label="Última vez" />,
    cell: ({ row }) => formatDate(row.original.ultima_vista),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as HostTableMeta | undefined
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

function SortableHeader({ column, label }: { column: Column<DetectorHost, unknown>; label: string }) {
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
