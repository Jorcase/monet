const DEFAULT_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api"

const API_BASE_URL = DEFAULT_BASE_URL.replace(/\/$/, "")
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

let csrfToken: string | null = null
let csrfPromise: Promise<string> | null = null

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type Primitive = string | number | boolean | undefined | null

export type QueryParams = Record<string, Primitive | Primitive[]>

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod
  body?: TBody
  headers?: Record<string, string>
  query?: QueryParams
  signal?: AbortSignal
  skipJson?: boolean
  csrf?: boolean
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

function buildUrl(path: string, query?: QueryParams) {
  const url = new URL(
    path.startsWith("http")
      ? path
      : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
  )

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry === undefined || entry === null) return
          url.searchParams.append(key, String(entry))
        })
        return
      }

      url.searchParams.set(key, String(value))
    })
  }

  return url.toString()
}

async function parseBody<T>(response: Response, skipJson?: boolean) {
  if (skipJson) {
    return response.text() as T
  }

  const contentType = response.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

async function request<TResponse = unknown, TBody = unknown>(
  path: string,
  {
    method = "GET",
    body,
    headers = {},
    query,
    signal,
    skipJson,
    csrf,
  }: RequestOptions<TBody> = {}
): Promise<TResponse> {
  const url = buildUrl(path, query)

  const init: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    signal,
    credentials: "include",
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData

  if (body !== undefined) {
    if (isFormData) {
      init.body = body
    } else {
      init.headers = {
        "Content-Type": "application/json",
        ...init.headers,
      }
      init.body = JSON.stringify(body)
    }
  }

  const needsCsrf = csrf ?? !SAFE_METHODS.has(method)
  if (needsCsrf) {
    const token = await ensureCsrfToken()
    if (token) {
      init.headers = {
        ...init.headers,
        "X-CSRFToken": token,
      }
    }
  }

  const response = await fetch(url, init)

  if (!response.ok) {
    const rawText = await response.text()
    let payload: unknown = rawText
    try {
      payload = rawText ? JSON.parse(rawText) : rawText
    } catch {
      // keep raw text
    }

    throw new ApiError(
      `Solicitud fallida (${response.status})`,
      response.status,
      payload
    )
  }

  return parseBody<TResponse>(response, skipJson)
}

export const apiClient = {
  request,
  get: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  delete: <T = unknown>(path: string, options?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...options, method: "DELETE" }),
  post: <T = unknown, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">
  ) => request<T, TBody>(path, { ...options, body, method: "POST" }),
  put: <T = unknown, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">
  ) => request<T, TBody>(path, { ...options, body, method: "PUT" }),
  patch: <T = unknown, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">
  ) => request<T, TBody>(path, { ...options, body, method: "PATCH" }),
}

export type ApiClient = typeof apiClient

async function fetchCsrfFromServer() {
  const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error("No se pudo obtener el token CSRF")
  }
  const data = (await response.json()) as { csrfToken?: string }
  csrfToken = data?.csrfToken ?? null
  return csrfToken ?? ""
}

async function ensureCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken) {
    return csrfToken
  }
  if (!force && csrfPromise) {
    return csrfPromise
  }
  csrfPromise = fetchCsrfFromServer().finally(() => {
    csrfPromise = null
  })
  return csrfPromise
}

export async function refreshCsrfToken(force = false) {
  return ensureCsrfToken(force)
}

export function clearCsrfToken() {
  csrfToken = null
}
