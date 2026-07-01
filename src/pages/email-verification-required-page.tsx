import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { LogOut, MailCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AuthScreen } from "@/components/auth-screen"
import { useAuth } from "@/app/auth-context"
import { useLogout, useResendVerification } from "@/features/auth"

export function EmailVerificationRequiredPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const logout = useLogout()
  const resend = useResendVerification()

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
    } finally {
      navigate("/login", { replace: true })
    }
  }

  return (
    <AuthScreen>
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MailCheck className="size-6" />
          </span>
          <CardTitle>{t("verify.requiredTitle")}</CardTitle>
          <CardDescription>
            {t("verify.requiredMessage", { email: user?.email ?? "" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {resend.isSuccess ? (
            <p className="text-center text-sm text-status-delivered">
              {t("verify.resent")}
            </p>
          ) : (
            <Button
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="w-full"
            >
              {t("verify.resend")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="w-full"
          >
            <LogOut />
            {t("auth.logout")}
          </Button>
        </CardContent>
      </Card>
    </AuthScreen>
  )
}
