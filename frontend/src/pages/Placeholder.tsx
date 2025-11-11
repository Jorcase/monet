interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center text-muted-foreground">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="max-w-xl text-sm text-muted-foreground">{description}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Esta vista todavía no está lista. Próximamente conectaremos los datos
          del backend.
        </p>
      )}
    </div>
  )
}
