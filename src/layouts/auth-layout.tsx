import { Outlet } from "react-router-dom"
import { AuthScreen } from "@/components/auth-screen"

export function AuthLayout() {
  return (
    <AuthScreen>
      <Outlet />
    </AuthScreen>
  )
}
