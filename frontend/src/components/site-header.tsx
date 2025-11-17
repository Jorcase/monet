import {
  BookCopyIcon,
  CpuIcon,
  DatabaseIcon,
  HardDriveIcon,
  PackageSearchIcon,
  ServerCogIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NavigationMenuRouterLink } from "@/components/navigation-menu-router-link"

const NAV_SECTIONS = [
  {
    title: "Alertas",
    items: [
      { name: "Reglas", url: "/alertas/reglas", icon: ShieldAlertIcon },
      { name: "Eventos", url: "/alertas/eventos", icon: ServerCogIcon },
    ],
  },
  {
    title: "Detector",
    items: [
      { name: "Dispositivos", url: "/detector/dispositivos", icon: HardDriveIcon },
      { name: "Hosts", url: "/detector/hosts", icon: CpuIcon },
      { name: "Análisis", url: "/detector/analisis", icon: DatabaseIcon },
    ],
  },
  {
    title: "Escáner",
    items: [
      { name: "Puertos", url: "/escaner/puertos", icon: PackageSearchIcon },
      { name: "Escáneres", url: "/escaner/escanners", icon: ServerCogIcon },
    ],
  },
  {
    title: "Capturas",
    items: [
      { name: "Paquetes", url: "/captura/paquetes", icon: BookCopyIcon },
      { name: "Dominios", url: "/captura/dominios", icon: BookCopyIcon },
      { name: "Sesiones", url: "/captura/sesiones", icon: DatabaseIcon },
      
    ],
  },
]

export function SiteHeader() {
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <div className="flex flex-1 items-center justify-between gap-2">
          <NavigationMenu className="max-w-max">
            <NavigationMenuList className="flex-wrap justify-start">
              {NAV_SECTIONS.map((section) => (
                <NavigationMenuItem key={section.title} className="relative">
                  <NavigationMenuTrigger>{section.title}</NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-[220px]">
                    <ul className="grid gap-1 p-3 md:w-[260px]">
                      {section.items.map((item) => (
                        <li key={item.url}>
                          <NavigationMenuRouterLink
                            to={item.url}
                            className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
                          >
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                            <span>{item.name}</span>
                          </NavigationMenuRouterLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
