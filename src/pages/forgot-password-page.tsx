import { useEffect, useState } from "react"
import type * as React from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CheckCircle2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/form-field"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { useForgotPassword } from "@/features/auth"

const RESEND_COOLDOWN = 30

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const forgotPassword = useForgotPassword()

  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const fieldErrors = getFieldErrors(forgotPassword.error)
  const generalError =
    forgotPassword.isError && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(forgotPassword.error)
      : null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (cooldown > 0) return
    try {
      await forgotPassword.mutateAsync({ email: email.trim() })
      setSent(true)
      setCooldown(RESEND_COOLDOWN)
    } catch {
      /* erreur affichée via forgotPassword.error */
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CheckCircle2 className="size-6" />
          </span>
          <CardTitle>{t("auth.forgotPassword.sentTitle")}</CardTitle>
          <CardDescription>
            {t("auth.forgotPassword.sentMessage")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={cooldown > 0 || forgotPassword.isPending}
            onClick={handleSubmit}
          >
            {cooldown > 0
              ? t("auth.forgotPassword.resendIn", { seconds: cooldown })
              : t("auth.forgotPassword.resend")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-brand-800 hover:underline"
            >
              {t("auth.forgotPassword.backToLogin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.forgotPassword.title")}</CardTitle>
        <CardDescription>{t("auth.forgotPassword.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          {generalError && (
            <Alert variant="destructive">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          <FormField
            id="email"
            type="email"
            autoComplete="email"
            label={t("common.email")}
            placeholder={t("common.placeholders.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />

          <Button
            type="submit"
            loading={forgotPassword.isPending}
            className="w-full"
          >
            {t("auth.forgotPassword.submit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-brand-800 hover:underline"
            >
              {t("auth.forgotPassword.backToLogin")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
