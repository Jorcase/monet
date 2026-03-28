import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { analyticsService } from "@/services/analyticsService"
import type { AnalyticsEvent } from "@/types/analytics"

const IMPORTANT_SEVERITIES = new Set(["media", "alta", "critica"])

const SEVERITY_COLORS: Record<string, string> = {
  media: "text-amber-500",
  alta: "text-orange-500",
  critica: "text-red-600",
}

type AlertBellProps = {
  className?: string
}

const formatRelativeTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return "hace instantes"
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

export function AlertBell({ className }: AlertBellProps) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)
  const [markingIds, setMarkingIds] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await analyticsService.fetchEvents({
        limit: 50,
        notificado: false,
      })
      const filtered = fetched.filter(
        (event) => IMPORTANT_SEVERITIES.has(event.severidad) && !event.notificado
      )
      setEvents(filtered)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 30000)
    return () => window.clearInterval(id)
  }, [load])

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
  }

  const handleEventClick = useCallback(
    async (eventId: number) => {
      setMarkingIds((prev) => {
        const next = new Set(prev)
        next.add(eventId)
        return next
      })
      try {
        await analyticsService.markEventNotified(eventId, true)
        setEvents((prev) => prev.filter((event) => event.id !== eventId))
      } catch {
        // ignore
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev)
          next.delete(eventId)
          return next
        })
      }
    },
    [setEvents]
  )

  const handleViewAll = useCallback(async () => {
    if (!acknowledging && events.length) {
      setAcknowledging(true)
      try {
        await Promise.all(events.map((event) => analyticsService.markEventNotified(event.id, true)))
        setEvents([])
        await load()
      } catch {
        // ignore
      } finally {
        setAcknowledging(false)
      }
    }
    navigate("/alertas/eventos")
  }, [acknowledging, events, load, navigate])

  const count = events.length
  const topEvents = useMemo(() => events.slice(0, 6), [events])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          aria-label="Abrir notificaciones"
        >
          <Bell className="h-4 w-4" />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificaciones</p>
          <button
            type="button"
            onClick={load}
            className="text-xs font-medium text-primary hover:underline"
          >
            Actualizar
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto px-1 py-2">
          {loading && (
            <p className="px-2 py-2 text-xs text-muted-foreground">Cargando alertas...</p>
          )}
          {!loading && topEvents.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No hay alertas pendientes
            </p>
          ) : null}
          {!loading
            ? topEvents.map((event) => {
                const marking = markingIds.has(event.id)
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => handleEventClick(event.id)}
                    disabled={marking}
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                      marking && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium leading-tight">
                        {event.regla_detalle?.nombre ?? "Evento"}
                      </p>
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase",
                          SEVERITY_COLORS[event.severidad] ?? "text-muted-foreground"
                        )}
                      >
                        {event.severidad}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.descripcion?.slice(0, 120)}
                    </p>
                    {event.dispositivo ? (
                      <p className="text-[0.7rem] text-muted-foreground">
                        {event.dispositivo.hostname || event.dispositivo.ip}
                      </p>
                    ) : null}
                    <p className="text-[0.65rem] text-muted-foreground">
                      {formatRelativeTime(event.ts)}
                    </p>
                  </button>
                )
              })
            : null}
        </div>
        <div className="border-t px-3 py-2 text-right text-xs">
          <button
            type="button"
            onClick={handleViewAll}
            className="text-primary hover:underline disabled:opacity-60"
            disabled={acknowledging}
          >
            Ver todas las alertas
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
