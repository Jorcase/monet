import { useState } from "react"
import type { FormEvent } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/hooks/useAuth"
import { parseApiError } from "@/lib/api-error"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const fromPath =
    (location.state as { from?: Location })?.from?.pathname ?? "/dashboard"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const username = String(form.get("username") ?? "").trim()
    const password = String(form.get("password") ?? "")

    if (!username || !password) {
      setError("Completá usuario y contraseña.")
      return
    }

    try {
      await login({ username, password })
      navigate(fromPath, { replace: true })
    } catch (err) {
      setError(parseApiError(err, "No se pudo iniciar sesión."))
    }
  }

  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/vite.svg"
          alt="Fondo"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <div className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Monet
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">
            <LoginForm
              onSubmit={handleSubmit}
              loading={authLoading}
              errorMessage={error}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
