import { useState } from "react"
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ScannerPort } from "@/types/scanner"

import type { PortTableMeta } from "./port-columns"
import { portColumns } from "./port-columns"

type PortsDataTableProps = {
  data: ScannerPort[]
  loading?: boolean
  error?: string | null
  onRowClick?: (port: ScannerPort) => void
}

const STATE_OPTIONS = [
  { label: "Todos", value: "todos" },
  { label: "Abierto", value: "abierto" },
  { label: "Filtrado", value: "filtrado" },
  { label: "Cerrado", value: "cerrado" },
]

export function PortsDataTable({ data, loading, error, onRowClick }: PortsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "detected_at", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ search: false })

  const table = useReactTable({
    data,
    columns: portColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 12,
      },
      columnVisibility: { search: false },
      sorting: [{ id: "detected_at", desc: true }],
    },
    meta: {
      onView: (port: ScannerPort) => onRowClick?.(port),
    } satisfies PortTableMeta,
  })

  const searchColumn = table.getColumn("search")
  const stateColumn = table.getColumn("estado")
  const jobColumn = table.getColumn("trabajo")

  const pagination = table.getState().pagination
  const pageRows = table.getRowModel().rows.length
  const rangeStart = pageRows ? pagination.pageIndex * pagination.pageSize + 1 : 0
  const rangeEnd = pageRows ? rangeStart + pageRows - 1 : 0
  const totalFiltered = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Buscar por host, servicio, protocolo u objetivo..."
          value={(searchColumn?.getFilterValue() as string) ?? ""}
          onChange={(event) => searchColumn?.setFilterValue(event.target.value)}
          className="w-full lg:max-w-sm"
        />
        <Select
          value={(stateColumn?.getFilterValue() as string) ?? "todos"}
          onValueChange={(value) => stateColumn?.setFilterValue(value)}
        >
          <SelectTrigger className="w-full lg:w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={1}
          placeholder="Trabajo #"
          value={(jobColumn?.getFilterValue() as string) ?? ""}
          onChange={(event) => jobColumn?.setFilterValue(event.target.value)}
          className="w-full lg:w-32"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto w-full lg:w-auto">
              Columnas
              <ChevronDown className="ml-1.5 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Visible</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando puertos...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 py-2 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          {pageRows
            ? `Mostrando ${rangeStart}–${rangeEnd} de ${totalFiltered} puertos`
            : "Sin puertos para mostrar."}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
