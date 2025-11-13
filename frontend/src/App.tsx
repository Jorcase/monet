import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/AuthContext"
import DashboardPage from "@/pages/Dashboard"
import AgentPage from "@/pages/AgentPage"
import DetectorPage from "@/pages/DetectorPage"
import CapturePage from "@/pages/CapturePage"
import LoginPage from "@/pages/Login"
import { PlaceholderPage } from "@/pages/Placeholder"
import SignupPage from "@/pages/Sign-up"
import DevicesPage from "@/pages/detectores/DevicesPage"
import DeviceDetailPage from "@/pages/detectores/DeviceDetailPage"
import { GuestRoute, ProtectedRoute } from "@/routes/ProtectedRoute"

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route
                  element={
                    <SidebarProvider>
                      <MainShell />
                    </SidebarProvider>
                  }
                >
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/agente" element={<AgentPage />} />
                  <Route path="/agente/agentes" element={<AgentPage />} />
                  <Route path="/detector" element={<DetectorPage />} />
                  <Route path="/detector/dispositivos" element={<DevicesPage />} />
                  <Route path="/detector/dispositivos/:deviceId" element={<DeviceDetailPage />} />
                  <Route
                    path="/detector/hosts"
                    element={
                      <PlaceholderPage
                        title="Hosts"
                        description="Detalles de hosts descubiertos durante las capturas."
                      />
                    }
                  />
                  <Route
                    path="/detector/analisis"
                    element={
                      <PlaceholderPage
                        title="Análisis"
                        description="Historial de análisis realizados por el detector."
                      />
                    }
                  />
                  <Route path="/captura" element={<CapturePage />} />
                  <Route path="/captura/sesiones" element={<CapturePage />} />
                  <Route
                    path="/captura/paquetes"
                    element={
                      <PlaceholderPage
                        title="Paquetes"
                        description="Explorá paquetes y archivos PCAP almacenados."
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
                    path="/escaner/puertos"
                    element={
                      <PlaceholderPage
                        title="Puertos"
                        description="Resumen de puertos detectados en los escaneos."
                      />
                    }
                  />
                  <Route
                    path="/escaner/escanners"
                    element={
                      <PlaceholderPage
                        title="Escáneres"
                        description="Trabajos de escaneo y configuraciones ejecutadas."
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
                    path="/alertas/reglas"
                    element={
                      <PlaceholderPage
                        title="Reglas"
                        description="Gestioná las reglas que disparan alertas."
                      />
                    }
                  />
                  <Route
                    path="/alertas/eventos"
                    element={
                      <PlaceholderPage
                        title="Eventos"
                        description="Eventos generados por el motor de alertas."
                      />
                    }
                  />
                </Route>
              </Route>

              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

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
            <Toaster richColors closeButton />
          </TooltipProvider>
        </BrowserRouter>
      </AuthProvider>
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
