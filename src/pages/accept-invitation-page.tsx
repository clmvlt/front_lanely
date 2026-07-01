import { useState } from "react"
import type * as React from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
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
import { hasSession } from "@/lib/auth"
import { useAcceptInvitation } from "@/features/invitations"

export function AcceptInvitationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const code = params.get("code") ?? ""

  const accept = useAcceptInvitation()
  const authenticated = hasSession()

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

  const fieldErrors = getFieldErrors(accept.error)
  const generalError =
    accept.isError && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(accept.error)
      : null

  const passwordsMatch = form.password === form.confirmPassword
  const confirmError =
    !passwordsMatch && (triedSubmit || form.confirmPassword.length > 0)
      ? t("auth.passwordMismatch")
      : undefined

  const acceptAsCurrentUser = async () => {
    try {
      await accept.mutateAsync({ code })
      navigate("/app", { replace: true })
    } catch {
      /* erreur affichée via accept.error */
    }
  }

  // Google a ouvert la session (compte existant ou tout juste créé, tokens
  // posés) : on enchaîne sur l'acceptation de l'invitation en tant
  // qu'utilisateur authentifié. Les erreurs s'affichent sur la carte (la vue
  // bascule alors sur la branche authentifiée via `hasSession()`).
  const acceptViaGoogle = () => {
    setGoogleRegistration(null)
    void acceptAsCurrentUser()
  }

  const acceptWithNewAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!passwordsMatch) {
      setTriedSubmit(true)
      return
    }
    try {
      await accept.mutateAsync({
        code,
        newAccount: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
        },
      })
      navigate("/app", { replace: true })
    } catch {
      /* erreur affichée via accept.error */
    }
  }

  if (!code) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("invite.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{t("invite.missingCode")}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (googleRegistration) {
    return (
      <GoogleRegisterCard
        registration={googleRegistration}
        onCancel={() => setGoogleRegistration(null)}
        onRegistered={acceptViaGoogle}
      />
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("invite.title")}</CardTitle>
        <CardDescription>
          {authenticated
            ? t("invite.loggedInPrompt")
            : t("invite.newAccountPrompt")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {generalError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        {authenticated ? (
          <Button
            onClick={acceptAsCurrentUser}
            loading={accept.isPending}
            className="w-full"
          >
            {t("invite.accept")}
          </Button>
        ) : (
          <form onSubmit={acceptWithNewAccount} className="grid gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="firstName"
                autoComplete="given-name"
                label={t("common.firstName")}
                placeholder={t("common.placeholders.firstName")}
                value={form.firstName}
                onChange={update("firstName")}
                error={fieldErrors["newAccount.firstName"]}
                required
              />
              <FormField
                id="lastName"
                autoComplete="family-name"
                label={t("common.lastName")}
                placeholder={t("common.placeholders.lastName")}
                value={form.lastName}
                onChange={update("lastName")}
                error={fieldErrors["newAccount.lastName"]}
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
              error={fieldErrors["newAccount.email"]}
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
                error={fieldErrors["newAccount.password"]}
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

            <Button
              type="submit"
              loading={accept.isPending}
              className="w-full"
            >
              {t("invite.accept")}
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

            <GoogleSignInButton
              onRegistrationRequired={setGoogleRegistration}
              onAuthenticated={acceptViaGoogle}
            />

            <p className="text-center text-sm text-muted-foreground">
              {t("invite.haveAccount")}{" "}
              <Link
                to="/login"
                className="font-medium text-brand-800 hover:underline"
              >
                {t("auth.goLogin")}
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
