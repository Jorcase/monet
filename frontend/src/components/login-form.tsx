import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginFormProps extends React.ComponentPropsWithoutRef<"form"> {
  errorMessage?: string | null
  loading?: boolean
}

export function LoginForm({
  className,
  errorMessage,
  loading,
  ...props
}: LoginFormProps) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Usá tu usuario y contraseña para acceder al panel.
        </p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="username">Usuario</Label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="monet"
            autoComplete="username"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Crear cuenta
        </Link>
      </div>
    </form>
  )
}
