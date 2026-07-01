/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base de l'API Spring Boot (sans slash final), ex: https://api.lanely.fr */
  readonly VITE_API_BASE_URL: string
  /** Nom de l'environnement courant : dev | beta | demo | prod */
  readonly VITE_APP_ENV: "dev" | "beta" | "demo" | "prod"
  /** Client ID OAuth Google (Web) pour « Sign in with Google » */
  readonly VITE_GOOGLE_CLIENT_ID: string
  /** URL de base de l'API ORS (routing, optimisation, geocodage) ; repli code en dur */
  readonly VITE_ORS_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Identifiant du build courant, injecte au build par Vite (cf. vite.config.ts). */
declare const __BUILD_ID__: string
