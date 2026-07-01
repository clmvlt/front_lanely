import { Navigate, Outlet } from "react-router-dom"
import { hasSession } from "@/lib/auth"
import { FullPageSpinner } from "@/components/full-page-spinner"
import { useAuth } from "./auth-context"

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (!hasSession()) return <Navigate to="/login" replace />
  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/app" replace />

  return <Outlet />
}
