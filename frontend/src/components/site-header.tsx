import { useMemo } from "react"
import { Link, useLocation } from "react-router-dom"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type Crumb = {
  label: string
  href?: string
}

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  agente: "Agente",
  detector: "Detector",
  escaner: "Escáner de Puertos",
  captura: "Captura de Paquetes",
  alertas: "Alertas",
  dispositivos: "Dispositivos",
  hosts: "Hosts",
  flujos: "Flujos",
  configuracion: "Configuración",
  busqueda: "Búsqueda",
}

const formatSegment = (segment: string) =>
  segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

export function SiteHeader() {
  const location = useLocation()
  const crumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean)
    const items: Crumb[] = []
    const base: Crumb = { label: "Dashboard", href: "/dashboard" }

    if (segments.length === 0) {
      items.push({ ...base })
      return items
    }

    let remaining = segments
    if (segments[0] === "dashboard") {
      items.push({ ...base })
      remaining = segments.slice(1)
      if (remaining.length === 0) {
        return items
      }
    } else {
      items.push(base)
    }

    remaining.forEach((segment, index) => {
      const href = `/${segments.slice(0, segments.length - remaining.length + index + 1).join("/")}`
      items.push({
        label: LABEL_MAP[segment] ?? formatSegment(segment),
        href,
      })
    })

    return items
  }, [location.pathname])

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1
                return (
                  <BreadcrumbItem key={`${crumb.href ?? crumb.label}-${index}`} className="flex items-center">
                    {isLast ? (
                      <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href ?? "#"} className="truncate">
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                    {index < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                  </BreadcrumbItem>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
    </header>
  )
}
