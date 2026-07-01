import { useState } from "react"
import type * as React from "react"
import { Link, useNavigate } from "react-router-dom"
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
import { PasswordStrength } from "@/components/password-strength"
import {
  GoogleSignInButton,
  type GoogleRegistrationState,
} from "@/components/google-sign-in-button"
import { GoogleRegisterCard } from "@/components/google-register-card"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { useRegister } from "@/features/auth"

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegister()

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [googleRegistration, setGoogleRegistration] =
    useState<GoogleRegistrationState | null>(null)

  const update =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const fieldErrors = getFieldErrors(register.error)
  const generalError =
    register.isError && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(register.error)
      : null

  const passwordsMatch = form.password === form.confirmPassword
  const confirmError =
    !passwordsMatch && (triedSubmit || form.confirmPassword.length > 0)
      ? t("auth.passwordMismatch")
      : undefined

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordsMatch) {
      setTriedSubmit(true)
      return
    }
    try {
      await register.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      })
      navigate("/app", { replace: true })
    } catch {
      /* erreur affichée via register.error */
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
        <CardTitle>{t("auth.registerTitle")}</CardTitle>
        <CardDescription>{t("auth.registerSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          {generalError && (
            <Alert variant="destructive">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="firstName"
              autoComplete="given-name"
              label={t("common.firstName")}
              placeholder={t("common.placeholders.firstName")}
              value={form.firstName}
              onChange={update("firstName")}
              error={fieldErrors.firstName}
              required
            />
            <FormField
              id="lastName"
              autoComplete="family-name"
              label={t("common.lastName")}
              placeholder={t("common.placeholders.lastName")}
              value={form.lastName}
              onChange={update("lastName")}
              error={fieldErrors.lastName}
              required
            />
          </div>
          <FormField
            id="email"
            type="email"
            autoComplete="email"
            label={t("common.email")}
            placeholder={t("common.placeholders.email")}
            value={form.email}
            onChange={update("email")}
            error={fieldErrors.email}
            required
          />
          <div className="grid gap-2">
            <FormField
              id="password"
              type="password"
              autoComplete="new-password"
              label={t("common.password")}
              placeholder={t("common.placeholders.password")}
              value={form.password}
              onChange={update("password")}
              error={fieldErrors.password}
              hint={t("auth.passwordHint")}
              required
            />
            <PasswordStrength value={form.password} />
          </div>
          <FormField
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            label={t("common.confirmPassword")}
            placeholder={t("common.placeholders.password")}
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            error={confirmError}
            required
          />

          <Button type="submit" loading={register.isPending} className="w-full">
            {t("auth.registerSubmit")}
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
            {t("auth.hasAccount")}{" "}
            <Link
              to="/login"
              className="font-medium text-brand-800 hover:underline"
            >
              {t("auth.goLogin")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
