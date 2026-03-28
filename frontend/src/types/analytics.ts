export interface AnalyticsRule {
  id: number
  nombre: string
  modulo_objetivo: string
  tipo: string
  descripcion: string
  severidad_por_defecto: string
  parametros: Record<string, unknown>
  activa: boolean
  creada: string
  actualizada: string
}

export interface AnalyticsEvent {
  id: number
  regla: number
  regla_detalle: AnalyticsRule
  severidad: string
  descripcion: string
  evidencia: Record<string, unknown>
  notificado: boolean
  ts: string
  dispositivo?: {
    id: number
    hostname: string
    ip: string
  } | null
  captura_sesion?: number | null
  captura_flujo?: number | null
  analisis?: number | null
  puerto_resumen?: number | null
}

export interface CreateRulePayload {
  nombre: string
  modulo_objetivo: string
  tipo: string
  descripcion?: string
  severidad_por_defecto: string
  parametros?: Record<string, unknown>
  activa: boolean
}

export type UpdateRulePayload = Partial<CreateRulePayload>
