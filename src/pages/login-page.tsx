import { useState } from "react"
import type * as React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
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
import {
  GoogleSignInButton,
  type GoogleRegistrationState,
} from "@/components/google-sign-in-button"
import { GoogleRegisterCard } from "@/components/google-register-card"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { getDeviceLabel } from "@/lib/device"
import { useLogin } from "@/features/auth"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()

  const notice =
    typeof (location.state as { notice?: unknown } | null)?.notice === "string"
      ? (location.state as { notice: string }).notice
      : null

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [googleRegistration, setGoogleRegistration] =
    useState<GoogleRegistrationState | null>(null)

  const fieldErrors = getFieldErrors(login.error)
  const generalError =
    login.isError && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(login.error)
      : null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await login.mutateAsync({
        input: { email, password },
        deviceLabel: getDeviceLabel(),
      })
      navigate("/app", { replace: true })
    } catch {
      /* erreur affichée via login.error */
    }
  }

  if (googleRegistration) {
    return (
      <GoogleRegisterCard
        registration={googleRegistration}
        onCancel={() => setGoogleRegistration(null)}
      />
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.loginTitle")}</CardTitle>
        <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          {notice && (
            <Alert>
              <AlertDescription>{t(notice, { defaultValue: notice })}</AlertDescription>
            </Alert>
          )}

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
          <FormField
            id="password"
            type="password"
            autoComplete="current-password"
            label={t("common.password")}
            placeholder={t("common.placeholders.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />

          <div className="-mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-brand-800 hover:underline"
            >
              {t("auth.forgotLink")}
            </Link>
          </div>

          <Button type="submit" loading={login.isPending} className="w-full">
            {t("auth.loginSubmit")}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t("auth.or")}
              </span>
            </div>
          </div>

          <GoogleSignInButton onRegistrationRequired={setGoogleRegistration} />

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              to="/register"
              className="font-medium text-brand-800 hover:underline"
            >
              {t("auth.goRegister")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
