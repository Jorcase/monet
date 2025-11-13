import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { authService } from "@/services/authService"
import type { AuthUser, LoginPayload, RegisterPayload } from "@/services/authService"
import { clearCsrfToken } from "@/services/apiClient"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  initializing: boolean
  authLoading: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  logout: () => Promise<void>
  register: (payload: RegisterPayload) => Promise<AuthUser>
  refresh: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const me = await authService.me()
      setUser(me)
      return me
    } catch {
      setUser(null)
      return null
    } finally {
      setInitializing(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (payload: LoginPayload) => {
      setAuthLoading(true)
      try {
        const logged = await authService.login(payload)
        setUser(logged)
        return logged
      } finally {
        setAuthLoading(false)
      }
    },
    []
  )

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setAuthLoading(true)
      try {
        const created = await authService.register(payload)
        setUser(created)
        return created
      } finally {
        setAuthLoading(false)
      }
    },
    []
  )

  const logout = useCallback(async () => {
    setAuthLoading(true)
    try {
      await authService.logout()
    } finally {
      setAuthLoading(false)
      setUser(null)
      clearCsrfToken()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      authLoading,
      login,
      logout,
      register,
      refresh,
    }),
    [authLoading, initializing, login, logout, refresh, register, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider")
  }
  return ctx
}
