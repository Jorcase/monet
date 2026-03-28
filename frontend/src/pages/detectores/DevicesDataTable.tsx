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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import type { DetectorDevice } from "@/types/detector"

import type { DeviceTableMeta } from "./device-columns"
import { deviceColumns } from "./device-columns"

type DevicesDataTableProps = {
  data: DetectorDevice[]
  loading?: boolean
  error?: string | null
  onRowClick?: (device: DetectorDevice) => void
}

const STATUS_OPTIONS = [
  { label: "Todos", value: "todos" },
  { label: "Activo", value: "activo" },
  { label: "Inactivo", value: "inactivo" },
  { label: "Desconocido", value: "desconocido" },
]

export function DevicesDataTable({ data, loading, error, onRowClick }: DevicesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "ultima_vez", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ search: false })

  const table = useReactTable({
    data,
    columns: deviceColumns,
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
      sorting: [{ id: "ultima_vez", desc: true }],
    },
    meta: {
      onView: (device: DetectorDevice) => onRowClick?.(device),
    } satisfies DeviceTableMeta,
  })

  const searchColumn = table.getColumn("search")
  const statusColumn = table.getColumn("estado")
  const pagination = table.getState().pagination
  const pageRows = table.getRowModel().rows.length
  const rangeStart = pageRows ? pagination.pageIndex * pagination.pageSize + 1 : 0
  const rangeEnd = pageRows ? rangeStart + pageRows - 1 : 0
  const totalFiltered = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          placeholder="Buscar por IP, MAC, Vendor..."
          value={(searchColumn?.getFilterValue() as string) ?? ""}
          onChange={(event) => searchColumn?.setFilterValue(event.target.value)}
          className="w-full md:max-w-sm"
        />
        <Select
          value={(statusColumn?.getFilterValue() as string) ?? "todos"}
          onValueChange={(value) => statusColumn?.setFilterValue(value)}
        >
          <SelectTrigger className="md:w-[190px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto w-full md:w-auto">
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
                    Cargando dispositivos...
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
            ? `Mostrando ${rangeStart}–${rangeEnd} de ${totalFiltered} dispositivos`
            : "Sin resultados para mostrar."}
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
