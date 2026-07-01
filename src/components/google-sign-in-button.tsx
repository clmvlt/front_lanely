import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getErrorMessage } from "@/lib/api-error"
import { config } from "@/lib/config"
import { getDeviceLabel } from "@/lib/device"
import {
  initializeGoogleIdentity,
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from "@/lib/google-identity"
import { useGoogleLogin } from "@/features/auth"

/** Identité Google + ID token, transmis à l'étape de finalisation de compte. */
export interface GoogleRegistrationState {
  idToken: string
  email: string
  firstName: string
  lastName: string
}

interface GoogleSignInButtonProps {
  /**
   * Appelé quand Google authentifie un visiteur sans compte
   * (status REGISTRATION_REQUIRED) : la page doit alors afficher le formulaire
   * de finalisation pré-rempli (cf. GoogleRegisterCard).
   */
  onRegistrationRequired: (state: GoogleRegistrationState) => void
  /**
   * Override de la redirection par défaut (`/app`) quand un compte Google
   * existant est authentifié - ex. enchaîner l'acceptation d'une invitation.
   */
  onAuthenticated?: () => void
}

/**
 * Bouton « Sign in with Google » rendu par Google Identity Services.
 * Reçoit l'ID token (response.credential) et appelle POST /auth/google :
 * - AUTHENTICATED → ouvre la session et redirige comme un login classique ;
 * - REGISTRATION_REQUIRED → remonte l'identité pré-remplie via onRegistrationRequired.
 */
export function GoogleSignInButton({
  onRegistrationRequired,
  onAuthenticated,
}: GoogleSignInButtonProps) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const googleLogin = useGoogleLogin()
  const containerRef = useRef<HTMLDivElement>(null)

  // Langue active du site (résolue parmi en/fr), comme le LanguageSwitcher.
  const locale = i18n.resolvedLanguage ?? i18n.language

  // Le callback GSI est global et figé à l'init : on passe par une ref pour
  // toujours appeler la dernière version sans réinitialiser à chaque render.
  const handlerRef = useRef<(response: GoogleCredentialResponse) => void>(
    () => {},
  )
  handlerRef.current = async (response) => {
    const idToken = response.credential
    try {
      const result = await googleLogin.mutateAsync({
        input: { idToken },
        deviceLabel: getDeviceLabel(),
      })
      if (result.status === "AUTHENTICATED") {
        if (onAuthenticated) onAuthenticated()
        else navigate("/app", { replace: true })
      } else if (result.registration) {
        onRegistrationRequired({ idToken, ...result.registration })
      }
    } catch {
      /* erreur affichée via googleLogin.error */
    }
  }

  useEffect(() => {
    if (!config.googleClientId) return
    let cancelled = false
    let raf = 0

    loadGoogleIdentity(locale)
      .then((id) => {
        const container = containerRef.current
        if (cancelled || !container) return
        initializeGoogleIdentity(
          id,
          config.googleClientId,
          (response) => handlerRef.current(response),
          locale,
        )
        container.innerHTML = ""
        // Le rendu est différé à la frame suivante : lire `offsetWidth` ici
        // forcerait un reflow synchrone avant que les styles soient appliqués
        // (warning « la mise en page a été forcée », risque de FOUC).
        raf = requestAnimationFrame(() => {
          if (cancelled || !container.isConnected) return
          id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: container.offsetWidth || 320,
            locale,
          })
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [locale])

  if (!config.googleClientId) return null

  const error = googleLogin.isError ? getErrorMessage(googleLogin.error) : null

  return (
    <div className="grid gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div ref={containerRef} className="flex min-h-10 w-full justify-center" />
    </div>
  )
}
