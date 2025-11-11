import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import DashboardPage from "@/pages/Dashboard"
import LoginPage from "@/pages/Login"
import { PlaceholderPage } from "@/pages/Placeholder"
import SignupPage from "@/pages/Sign-up"

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <TooltipProvider>
          <SidebarProvider>
            <Routes>
              <Route element={<MainShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route
                  path="/agente"
                  element={
                    <PlaceholderPage
                      title="Agente de Red"
                      description="Vista donde se configurará y monitoreará el agente de red."
                    />
                  }
                />
                <Route
                  path="/detector"
                  element={
                    <PlaceholderPage
                      title="Detector de Hosts"
                      description="Resumen de hosts descubiertos y estado de las heurísticas."
                    />
                  }
                />
                <Route
                  path="/escaner"
                  element={
                    <PlaceholderPage
                      title="Escáner de Puertos"
                      description="Historial de escaneos y resultados por dispositivo."
                    />
                  }
                />
                <Route
                  path="/captura"
                  element={
                    <PlaceholderPage
                      title="Captura de Paquetes"
                      description="Ejecuciones de captura y estadísticas asociadas."
                    />
                  }
                />
                <Route
                  path="/alertas"
                  element={
                    <PlaceholderPage
                      title="Alertas"
                      description="Listado de eventos y alertas generadas por las heurísticas."
                    />
                  }
                />
                <Route
                  path="/dispositivos"
                  element={
                    <PlaceholderPage title="Dispositivos" description="Inventario consolidado de dispositivos detectados." />
                  }
                />
                <Route
                  path="/hosts"
                  element={
                    <PlaceholderPage title="Hosts" description="Detalles de hosts descubiertos durante las capturas." />
                  }
                />
                <Route
                  path="/flujos"
                  element={
                    <PlaceholderPage title="Flujos" description="Registro de flujos capturados y metadatos relevantes." />
                  }
                />
                <Route
                  path="/configuracion"
                  element={
                    <PlaceholderPage
                      title="Configuración"
                      description="Preferencias generales de la plataforma Monet."
                    />
                  }
                />
                <Route
                  path="/busqueda"
                  element={
                    <PlaceholderPage
                      title="Búsqueda"
                      description="Buscador global para encontrar dispositivos, hosts o eventos."
                    />
                  }
                />
              </Route>

              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              <Route
                path="*"
                element={
                  <PlaceholderPage
                    title="Página no encontrada"
                    description="La ruta ingresada no existe en la aplicación."
                  />
                }
              />
            </Routes>
          </SidebarProvider>
        </TooltipProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

function MainShell() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
