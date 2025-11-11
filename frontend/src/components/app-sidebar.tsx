import * as React from "react"
import {
  CpuIcon,
  DatabaseIcon,
  HardDriveIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PackageSearchIcon,
  RadarIcon,
  SatelliteDishIcon,
  SearchIcon,
  ServerCogIcon,
  SettingsIcon,
  ShieldAlertIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Agente de Red",
      url: "/agente",
      icon: NetworkIcon,
    },
    {
      title: "Detector de Hosts",
      url: "/detector",
      icon: RadarIcon,
    },
    {
      title: "Escáner de Puertos",
      url: "/escaner",
      icon: ServerCogIcon,
    },
    {
      title: "Captura de Paquetes",
      url: "/captura",
      icon: PackageSearchIcon,
    },
    {
      title: "Alertas",
      url: "/alertas",
      icon: ShieldAlertIcon,
    },
  ],
  navSecondary: [
    {
      title: "Configuración",
      url: "/configuracion",
      icon: SettingsIcon,
    },
    {
      title: "Búsqueda",
      url: "/busqueda",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Dispositivos",
      url: "/dispositivos",
      icon: HardDriveIcon,
    },
    {
      name: "Hosts",
      url: "/hosts",
      icon: CpuIcon,
    },
    {
      name: "Flujos",
      url: "/flujos",
      icon: DatabaseIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link to="/dashboard">
                <SatelliteDishIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Monet</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
