export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

export interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  use_fedcm_for_prompt?: boolean
}

export interface GsiButtonConfiguration {
  type?: "standard" | "icon"
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  logo_alignment?: "left" | "center"
  width?: number
  locale?: string
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void
  renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void
  prompt: () => void
  cancel: () => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId
      }
    }
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client"

let loadPromise: Promise<GoogleAccountsId> | null = null
let loadedLocale: string | undefined

let initializedLocale: string | undefined
let activeCallback: (response: GoogleCredentialResponse) => void = () => {}

function injectScript(locale?: string): Promise<GoogleAccountsId> {
  return new Promise<GoogleAccountsId>((resolve, reject) => {
    const onLoaded = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id)
      else onFailed()
    }
    const onFailed = () => {
      loadPromise = null
      reject(new Error("Failed to load Google Identity Services"))
    }

    const script = document.createElement("script")
    // `hl` force la langue du bouton GSI ; sans lui le bouton suit la langue
    // du navigateur et ignore l'option `locale` de renderButton.
    script.src = locale ? `${GSI_SRC}?hl=${encodeURIComponent(locale)}` : GSI_SRC
    script.async = true
    script.defer = true
    script.dataset.gsi = "true"
    script.addEventListener("load", onLoaded)
    script.addEventListener("error", onFailed)
    document.head.appendChild(script)
  })
}

/**
 * Charge le script Google Identity Services et résout sur
 * `window.google.accounts.id`. Le script est mis en cache ; si `locale` change,
 * il est rechargé pour que le bouton bascule de langue. Rejette si le chargement
 * échoue.
 */
export function loadGoogleIdentity(locale?: string): Promise<GoogleAccountsId> {
  // Déjà chargé dans la bonne langue → réutiliser tel quel.
  if (window.google?.accounts?.id && loadedLocale === locale) {
    return Promise.resolve(window.google.accounts.id)
  }

  // Chargé dans une autre langue → repartir de zéro pour forcer la nouvelle `hl`.
  if (window.google?.accounts?.id && loadedLocale !== locale) {
    document
      .querySelectorAll('script[data-gsi="true"]')
      .forEach((script) => script.remove())
    window.google = undefined
    loadPromise = null
    initializedLocale = undefined
  }

  loadPromise ??= injectScript(locale).then((id) => {
    loadedLocale = locale
    return id
  })

  return loadPromise
}

/**
 * Initialise GSI une seule fois par locale. `google.accounts.id.initialize` est
 * un singleton global : le rappeler à chaque montage de bouton déclenche le
 * warning « initialize() is called multiple times ». Le callback réel est gardé
 * dans `activeCallback` pour que le dernier bouton monté reçoive la réponse sans
 * avoir à réinitialiser GSI.
 */
export function initializeGoogleIdentity(
  id: GoogleAccountsId,
  clientId: string,
  callback: (response: GoogleCredentialResponse) => void,
  locale?: string,
): void {
  activeCallback = callback
  if (initializedLocale === locale) return
  id.initialize({
    client_id: clientId,
    callback: (response) => activeCallback(response),
  })
  initializedLocale = locale
}
