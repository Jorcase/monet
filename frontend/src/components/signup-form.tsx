import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface SignupFormProps extends React.ComponentProps<"form"> {
  errorMessage?: string | null
  loading?: boolean
}

export function SignupForm({ className, errorMessage, loading, ...props }: SignupFormProps) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Registrate para administrar tus agentes de Monet.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="username">Usuario</FieldLabel>
          <Input id="username" name="username" type="text" placeholder="monet" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <div className="grid gap-2 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
            <Input id="first_name" name="first_name" type="text" placeholder="Juan" />
          </Field>
          <Field>
            <FieldLabel htmlFor="last_name">Apellido</FieldLabel>
            <Input id="last_name" name="last_name" type="text" placeholder="Pérez" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="password">Contraseña</FieldLabel>
          <Input id="password" name="password" type="password" required />
          <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password_confirm">Confirmar contraseña</FieldLabel>
          <Input id="password_confirm" name="password_confirm" type="password" required />
        </Field>
        {errorMessage ? (
          <Field>
            <FieldDescription className="text-destructive" role="alert">
              {errorMessage}
            </FieldDescription>
          </Field>
        ) : null}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear cuenta"}
          </Button>
        </Field>
        <div className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </FieldGroup>
    </form>
  )
}
