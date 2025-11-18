import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { analyticsService } from "@/services/analyticsService"
import type { AnalyticsRule, CreateRulePayload } from "@/types/analytics"
import { useAnalyticsRules } from "@/hooks/useAnalyticsRules"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const MODULE_OPTIONS = [
  { label: "Todos", value: "todos" },
  { label: "Captura", value: "captura" },
  { label: "Detector", value: "detector" },
  { label: "Escáner", value: "escaner" },
  { label: "Global", value: "global" },
]

const TYPE_OPTIONS = [
  { label: "Todos", value: "todos" },
  { label: "Comportamiento", value: "comportamiento" },
  { label: "Firma", value: "firma" },
  { label: "Fingerprinting", value: "fingerprinting" },
  { label: "Otro", value: "otro" },
]

const SEVERITIES = [
  { label: "Baja", value: "baja" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
  { label: "Crítica", value: "critica" },
]

export default function AlertRulesPage() {
  const [moduleFilter, setModuleFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AnalyticsRule | null>(null)
  const moduleQuery = moduleFilter === "todos" ? undefined : moduleFilter
  const typeQuery = typeFilter === "todos" ? undefined : typeFilter
  const ruleFilters = useMemo(
    () => ({
      modulo: moduleQuery,
      tipo: typeQuery,
      search: search || undefined,
      activa: showOnlyActive ? true : undefined,
    }),
    [moduleQuery, typeQuery, search, showOnlyActive]
  )
  const { rules, loading, error, reload } = useAnalyticsRules(ruleFilters)

  const [formState, setFormState] = useState<CreateRulePayload>({
    nombre: "",
    modulo_objetivo: "captura",
    tipo: "comportamiento",
    descripcion: "",
    severidad_por_defecto: "media",
    parametros: {},
    activa: true,
  })

  const filteredRules = useMemo(() => rules, [rules])

  const handleOpenDialog = (rule?: AnalyticsRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormState({
        nombre: rule.nombre,
        modulo_objetivo: rule.modulo_objetivo,
        tipo: rule.tipo,
        descripcion: rule.descripcion,
        severidad_por_defecto: rule.severidad_por_defecto,
        parametros: rule.parametros,
        activa: rule.activa,
      })
    } else {
      setEditingRule(null)
      setFormState({
        nombre: "",
        modulo_objetivo: "captura",
        tipo: "comportamiento",
        descripcion: "",
        severidad_por_defecto: "media",
        parametros: {},
        activa: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingRule) {
        await analyticsService.updateRule(editingRule.id, formState)
        toast.success("Regla actualizada")
      } else {
        await analyticsService.createRule(formState)
        toast.success("Regla creada")
      }
      setDialogOpen(false)
      await reload()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo guardar la regla.")
    }
  }

  const handleDelete = async (rule: AnalyticsRule) => {
    if (!confirm(`¿Eliminar la regla ${rule.nombre}?`)) return
    try {
      await analyticsService.deleteRule(rule.id)
      toast.success("Regla eliminada")
      await reload()
    } catch (err) {
      console.error(err)
      toast.error("No se pudo eliminar la regla.")
    }
  }

  const handleParamChange = (value: string) => {
    try {
      const parsed = value.trim() ? JSON.parse(value) : {}
      setFormState((prev) => ({ ...prev, parametros: parsed }))
    } catch {
      // keep raw string? show toast maybe
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reglas heurísticas</h1>
          <p className="text-sm text-muted-foreground">
            Administra las reglas que disparan eventos en los diferentes módulos.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nueva regla
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Filtra y gestiona tus reglas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={showOnlyActive} onCheckedChange={setShowOnlyActive} />
              Solo activas
            </label>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando reglas...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filteredRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No se encontraron reglas.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Actualizada</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.nombre}</TableCell>
                      <TableCell>{renderModule(rule.modulo_objetivo)}</TableCell>
                      <TableCell>{renderType(rule.tipo)}</TableCell>
                      <TableCell className="capitalize">{renderSeverity(rule.severidad_por_defecto)}</TableCell>
                      <TableCell>{rule.activa ? "Activa" : "Inactiva"}</TableCell>
                      <TableCell>{new Date(rule.actualizada).toLocaleString()}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(rule)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar regla" : "Nueva regla"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input
                value={formState.nombre}
                onChange={(event) => setFormState((prev) => ({ ...prev, nombre: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Módulo objetivo</Label>
                <Select
                  value={formState.modulo_objetivo}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, modulo_objetivo: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.filter((option) => option.value !== "todos").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formState.tipo}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.filter((option) => option.value !== "todos").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={formState.descripcion}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, descripcion: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Severidad por defecto</Label>
                <Select
                  value={formState.severidad_por_defecto}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, severidad_por_defecto: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={formState.activa}
                    onCheckedChange={(value) =>
                      setFormState((prev) => ({ ...prev, activa: Boolean(value) }))
                    }
                  />
                  {formState.activa ? "Activa" : "Inactiva"}
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parámetros (JSON)</Label>
              <Textarea
                rows={4}
                defaultValue={
                  formState.parametros && Object.keys(formState.parametros).length
                    ? JSON.stringify(formState.parametros, null, 2)
                    : ""
                }
                onBlur={(event) => handleParamChange(event.target.value)}
                placeholder='Ej: {"tipo": "estado_puerto", "estado": "abierto", "puertos": [80, 443], "protocolos": ["tcp"]}'
              />
              
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>{editingRule ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function renderModule(value: string) {
  return MODULE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function renderType(value: string) {
  return TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function renderSeverity(value: string) {
  return SEVERITIES.find((option) => option.value === value)?.label ?? value
}
