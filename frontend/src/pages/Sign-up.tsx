import { useState } from "react"
import type { FormEvent } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

import { SignupForm } from "@/components/signup-form"
import { useAuth } from "@/hooks/useAuth"
import { parseApiError } from "@/lib/api-error"

export default function SignupPage() {
  const { register, authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  const fromPath =
    (location.state as { from?: Location })?.from?.pathname ?? "/dashboard"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const username = String(form.get("username") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const first_name = String(form.get("first_name") ?? "").trim()
    const last_name = String(form.get("last_name") ?? "").trim()
    const password = String(form.get("password") ?? "")
    const password_confirm = String(form.get("password_confirm") ?? "")

    if (!username || !email || !password) {
      setError("Completá todos los campos obligatorios.")
      return
    }

    if (password !== password_confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    try {
      await register({
        username,
        email,
        password,
        password_confirm,
        first_name,
        last_name,
      })
      navigate(fromPath, { replace: true })
    } catch (err) {
      setError(parseApiError(err, "No se pudo crear la cuenta."))
    }
  }

  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/placeholder.svg"
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
            <SignupForm
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
