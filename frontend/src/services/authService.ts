import { apiClient, refreshCsrfToken } from "@/services/apiClient"

export interface AuthUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

interface AuthResponse {
  user: AuthUser
  detail?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  password_confirm: string
  first_name?: string
  last_name?: string
}

async function login(payload: LoginPayload): Promise<AuthUser> {
  await refreshCsrfToken()
  const data = await apiClient.post<AuthResponse, LoginPayload>("/auth/login/", payload)
  await refreshCsrfToken(true)
  return data.user
}

async function logout(): Promise<void> {
  await refreshCsrfToken()
  await apiClient.post<{ detail: string }>("/auth/logout/")
}

async function register(payload: RegisterPayload): Promise<AuthUser> {
  await refreshCsrfToken()
  const data = await apiClient.post<AuthResponse, RegisterPayload>("/auth/register/", payload)
  await refreshCsrfToken(true)
  return data.user
}

async function me(): Promise<AuthUser> {
  const data = await apiClient.get<AuthResponse>("/auth/me/")
  return data.user
}

export const authService = {
  login,
  logout,
  register,
  me,
}
