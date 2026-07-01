import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { hasSession, onUnauthorized } from "@/lib/auth"
import { useMe, type MeUser } from "@/features/auth"

interface AuthContextValue {
  user: MeUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { data, isLoading } = useMe()

  useEffect(
    () => onUnauthorized(() => navigate("/login", { replace: true })),
    [navigate],
  )

  const value: AuthContextValue = {
    user: data?.user ?? null,
    isLoading: hasSession() && isLoading,
    isAuthenticated: Boolean(data?.user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
