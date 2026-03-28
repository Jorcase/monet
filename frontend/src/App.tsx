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
import HostsPage from "@/pages/detectores/HostsPage"
import HostDetailPage from "@/pages/detectores/HostDetailPage"
import ScannerPage from "@/pages/ScannerPage"
import AlertsPage from "@/pages/alertas/AlertsPage"
import AlertRulesPage from "@/pages/alertas/AlertRulesPage"
import AlertEventsPage from "@/pages/alertas/AlertEventsPage"
import PortsPage from "@/pages/escaneos/PortsPage"
import PortDetailPage from "@/pages/escaneos/PortDetailPage"
import FlowsPage from "@/pages/capturas/FlowsPage"
import DomainCategoriesPage from "@/pages/capturas/DomainCategoriesPage"
import FlowDetailPage from "@/pages/capturas/FlowDetailPage"
import SessionDetailPage from "@/pages/capturas/SessionDetailPage"
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
                  <Route path="/detector/hosts" element={<HostsPage />} />
                  <Route path="/detector/hosts/:hostId" element={<HostDetailPage />} />
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
                  <Route path="/captura/sesiones/:sessionId" element={<SessionDetailPage />} />
                  <Route path="/captura/paquetes" element={<FlowsPage />} />
                  <Route path="/captura/paquetes/:flowId" element={<FlowDetailPage />} />
                  <Route path="/captura/dominios" element={<DomainCategoriesPage />} />
                  <Route path="/escaner" element={<ScannerPage />} />
                  <Route path="/escaner/puertos" element={<PortsPage />} />
                  <Route path="/escaner/puertos/:portId" element={<PortDetailPage />} />
                  <Route
                    path="/escaner/escanners"
                    element={
                      <PlaceholderPage
                        title="Escáneres"
                        description="Trabajos de escaneo y configuraciones ejecutadas."
                      />
                    }
                  />
                  <Route path="/alertas" element={<AlertsPage />} />
                  <Route path="/alertas/reglas" element={<AlertRulesPage />} />
                  <Route path="/alertas/eventos" element={<AlertEventsPage />} />
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
