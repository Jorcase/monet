import { useState } from "react"
import { Loader2, Plus, Trash } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useDomainCategories } from "@/hooks/useDomainCategories"
import { domainService } from "@/services/domainService"

export default function DomainCategoriesPage() {
  const { categories, loading, error, reload, setCategories } = useDomainCategories()
  const [form, setForm] = useState({ sufijo: "", categoria: "", customCategoria: "" })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const categoriaFinal = form.categoria || form.customCategoria
    if (!form.sufijo.trim() || !categoriaFinal.trim()) {
      toast.error("Completá sufijo y categoría")
      return
    }
    setSaving(true)
    try {
      const created = await domainService.createDomainCategory({
        sufijo: form.sufijo.trim(),
        categoria: categoriaFinal.trim(),
        activo: true,
      })
      setCategories((prev) => [created, ...prev])
      setForm({ sufijo: "", categoria: "", customCategoria: "" })
      toast.success("Dominio agregado")
    } catch (err) {
      toast.error("No se pudo agregar el dominio")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: number, next: boolean) => {
    try {
      const updated = await domainService.updateDomainCategory(id, { activo: next })
      setCategories((prev) => prev.map((item) => (item.id === id ? updated : item)))
    } catch {
      toast.error("No se pudo actualizar el dominio")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await domainService.deleteDomainCategory(id)
      setCategories((prev) => prev.filter((item) => item.id !== id))
    } catch {
      toast.error("No se pudo eliminar el dominio")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dominios categorizados</h1>
        <p className="text-sm text-muted-foreground">
          Configura sufijos de dominio y su categoría para etiquetar el tráfico capturado.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo dominio</CardTitle>
          <CardDescription>Agrega sufijos (ej. facebook.com) y asignales una categoría.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Sufijo</Label>
              <Input
                placeholder="facebook.com"
                value={form.sufijo}
                onChange={(e) => setForm((prev) => ({ ...prev, sufijo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={form.categoria || "custom"}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    categoria: v === "custom" ? "" : v,
                    customCategoria: v === "custom" ? prev.customCategoria : "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizada</SelectItem>
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.categoria === "" ? (
                <Input
                  placeholder="ej. redes_sociales"
                  value={form.customCategoria}
                  onChange={(e) => setForm((prev) => ({ ...prev, customCategoria: e.target.value }))}
                />
              ) : null}
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Agregar
              </Button>
              <Button variant="outline" type="button" onClick={reload}>
                Recargar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Activa o desactiva sufijos; elimina los que no necesites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando dominios...
            </div>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay dominios configurados.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {categories.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.sufijo}</p>
                    <p className="text-xs text-muted-foreground">{item.categoria}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={item.activo}
                        onCheckedChange={(v) => toggleActive(item.id, v)}
                        disabled={loading}
                      />
                      Activo
                    </Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dominios precargados</CardTitle>
          <CardDescription>Estos sufijos vienen listos desde el backend como referencia inicial.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_DOMAINS.map((item) => (
            <div key={item.sufijo} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{item.sufijo}</p>
              <p className="text-xs text-muted-foreground">{item.categoria}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
const DEFAULT_CATEGORIES = ["redes_sociales", "apuestas", "streaming"]
const PRESET_DOMAINS: { sufijo: string; categoria: string }[] = [
  { sufijo: "facebook.com", categoria: "redes_sociales" },
  { sufijo: "instagram.com", categoria: "redes_sociales" },
  { sufijo: "whatsapp.com", categoria: "redes_sociales" },
  { sufijo: "whatsapp.net", categoria: "redes_sociales" },
  { sufijo: "tiktok.com", categoria: "redes_sociales" },
  { sufijo: "twitter.com", categoria: "redes_sociales" },
  { sufijo: "x.com", categoria: "redes_sociales" },
  { sufijo: "snapchat.com", categoria: "redes_sociales" },
  { sufijo: "bet365.com", categoria: "apuestas" },
  { sufijo: "bwin.com", categoria: "apuestas" },
  { sufijo: "pokerstars.com", categoria: "apuestas" },
  { sufijo: "codere.mx", categoria: "apuestas" },
  { sufijo: "codere.com", categoria: "apuestas" },
  { sufijo: "bingoboom.ru", categoria: "apuestas" },
  { sufijo: "netflix.com", categoria: "streaming" },
  { sufijo: "netflix.net", categoria: "streaming" },
  { sufijo: "disneyplus.com", categoria: "streaming" },
  { sufijo: "hulu.com", categoria: "streaming" },
  { sufijo: "primevideo.com", categoria: "streaming" },
  { sufijo: "spotify.com", categoria: "streaming" },
  { sufijo: "deezer.com", categoria: "streaming" },
]
