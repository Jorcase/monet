import { Navigate, Outlet, useLocation } from "react-router-dom"
import type { Location } from "react-router-dom"

import { useAuth } from "@/hooks/useAuth"

function FullscreenMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <FullscreenMessage message="Cargando sesión..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return <FullscreenMessage message="Verificando sesión..." />
  }

  if (isAuthenticated) {
    const to = (location.state as { from?: Location })?.from ?? { pathname: "/dashboard" }
    return <Navigate to={to} replace />
  }

  return <Outlet />
}
