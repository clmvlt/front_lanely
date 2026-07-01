import { useState } from "react"
import type * as React from "react"
import { useNavigate } from "react-router-dom"
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
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { getDeviceLabel } from "@/lib/device"
import { ApiError } from "@/lib/http"
import { useGoogleRegister } from "@/features/auth"
import type { GoogleRegistrationState } from "@/components/google-sign-in-button"

interface GoogleRegisterCardProps {
  registration: GoogleRegistrationState
  /** Revenir au login (ex. ID token Google expiré → relancer Sign-In). */
  onCancel: () => void
  /**
   * Override de la redirection par défaut (`/app`) après création du compte -
   * ex. enchaîner l'acceptation d'une invitation une fois la session ouverte.
   */
  onRegistered?: () => void
}

/**
 * Étape 2 du « Sign in with Google » : finalisation de compte.
 * Email en lecture seule (relu côté serveur depuis l'ID token), prénom/nom
 * pré-remplis et éditables, puis POST /auth/google/register avec le MÊME token.
 */
export function GoogleRegisterCard({
  registration,
  onCancel,
  onRegistered,
}: GoogleRegisterCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const googleRegister = useGoogleRegister()

  const [firstName, setFirstName] = useState(registration.firstName)
  const [lastName, setLastName] = useState(registration.lastName)

  const tokenExpired =
    googleRegister.error instanceof ApiError &&
    googleRegister.error.status === 401

  const fieldErrors = getFieldErrors(googleRegister.error)
  const generalError = tokenExpired
    ? t("auth.googleExpired")
    : googleRegister.isError && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(googleRegister.error)
      : null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await googleRegister.mutateAsync({
        input: { idToken: registration.idToken, firstName, lastName },
        deviceLabel: getDeviceLabel(),
      })
      if (onRegistered) onRegistered()
      else navigate("/app", { replace: true })
    } catch {
      /* erreur affichée via googleRegister.error */
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.googleCompleteTitle")}</CardTitle>
        <CardDescription>{t("auth.googleCompleteSubtitle")}</CardDescription>
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
            label={t("common.email")}
            value={registration.email}
            readOnly
            disabled
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="firstName"
              autoComplete="given-name"
              label={t("common.firstName")}
              placeholder={t("common.placeholders.firstName")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={fieldErrors.firstName}
              required
            />
            <FormField
              id="lastName"
              autoComplete="family-name"
              label={t("common.lastName")}
              placeholder={t("common.placeholders.lastName")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={fieldErrors.lastName}
              required
            />
          </div>

          {tokenExpired ? (
            <Button type="button" className="w-full" onClick={onCancel}>
              {t("auth.googleRestart")}
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                loading={googleRegister.isPending}
                className="w-full"
              >
                {t("auth.continue")}
              </Button>
              <button
                type="button"
                onClick={onCancel}
                className="text-center text-sm font-medium text-muted-foreground hover:underline"
              >
                {t("common.cancel")}
              </button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
