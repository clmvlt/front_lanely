import { useState } from "react"
import type * as React from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { XCircle } from "lucide-react"
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
import { PasswordStrength } from "@/components/password-strength"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { useResetPassword } from "@/features/auth"

const MIN_LENGTH = 8
const MAX_LENGTH = 100

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = (params.get("token") ?? "").trim()

  const resetPassword = useResetPassword()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [triedSubmit, setTriedSubmit] = useState(false)

  const fieldErrors = getFieldErrors(resetPassword.error)
  const generalError =
    resetPassword.isError && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(resetPassword.error)
      : null

  const lengthValid =
    password.length >= MIN_LENGTH && password.length <= MAX_LENGTH
  const passwordsMatch = password === confirmPassword

  const confirmError =
    !passwordsMatch && (triedSubmit || confirmPassword.length > 0)
      ? t("auth.passwordMismatch")
      : undefined

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    if (!lengthValid || !passwordsMatch) return
    try {
      await resetPassword.mutateAsync({ token, newPassword: password })
      navigate("/login", {
        replace: true,
        state: { notice: "auth.resetPassword.success" },
      })
    } catch {
      /* erreur affichée via resetPassword.error */
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="size-6" />
          </span>
          <CardTitle>{t("auth.resetPassword.invalidTitle")}</CardTitle>
          <CardDescription>
            {t("auth.resetPassword.invalidMessage")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/forgot-password">
              {t("auth.resetPassword.requestNewLink")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.resetPassword.title")}</CardTitle>
        <CardDescription>{t("auth.resetPassword.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          {generalError && (
            <Alert variant="destructive">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <FormField
              id="newPassword"
              type="password"
              autoComplete="new-password"
              label={t("auth.resetPassword.newPassword")}
              placeholder={t("common.placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.newPassword}
              hint={t("auth.passwordHint")}
              required
            />
            <PasswordStrength value={password} />
          </div>
          <FormField
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            label={t("auth.resetPassword.confirmPassword")}
            placeholder={t("common.placeholders.password")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmError}
            required
          />

          <Button
            type="submit"
            loading={resetPassword.isPending}
            className="w-full"
          >
            {t("auth.resetPassword.submit")}
          </Button>

          {generalError && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">
                {t("auth.resetPassword.requestNewLink")}
              </Link>
            </Button>
          )}

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
