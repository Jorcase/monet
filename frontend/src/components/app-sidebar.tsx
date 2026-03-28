import * as React from "react"
import {
  GitBranchIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PackageSearchIcon,
  SatelliteDishIcon,
  ServerCogIcon,
  ShieldAlertIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { AlertBell } from "@/components/alert-bell"
import { NavMain } from "@/components/nav-main"
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
import { useAuth } from "@/hooks/useAuth"

const data = {
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
      title: "Detector de dispositivos",
      url: "/detector",
      icon: NetworkIcon,
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
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <SidebarMenuButton
                asChild
                className="flex-1 data-[slot=sidebar-menu-button]:!p-1.5"
              >
                <Link to="/dashboard">
                  <SatelliteDishIcon className="h-5 w-5" />
                  <span className="text-base font-semibold">Monet</span>
                </Link>
              </SidebarMenuButton>
              <AlertBell className="shrink-0 group-data-[state=collapsed]:hidden group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="space-y-6">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="https://github.com/Jorcase/monet" target="_blank" rel="noreferrer">
                <GitBranchIcon />
                <span>Repositorio</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
