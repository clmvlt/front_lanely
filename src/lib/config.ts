/**
 * Configuration applicative dérivée des variables d'environnement Vite.
 * Les valeurs sont injectées au build depuis les fichiers .env.<mode>.
 */
export const config = {
  /** Environnement courant : dev | beta | demo | prod */
  env: import.meta.env.VITE_APP_ENV,
  /** URL de base de l'API Spring Boot (sans slash final) */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  /**
   * URL de base de l'API ORS (ors.stack.bzh) : routing, optimisation de
   * tournees et geocodage d'adresses (BAN). API ouverte, sans authentification.
   * Meme valeur sur tous les environnements ; repli code en dur.
   */
  orsBaseUrl: import.meta.env.VITE_ORS_BASE_URL || "https://ors.stack.bzh",
  /** Client ID OAuth Google (Web) pour « Sign in with Google » */
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  /**
   * Jeton public Mapbox (carte). Même valeur sur tous les environnements ;
   * fourni via VITE_MAPBOX_TOKEN dans le fichier .env du mode courant.
   */
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN || "",
  /** true uniquement en développement local (npm run dev) */
  isDev: import.meta.env.VITE_APP_ENV === "dev",
  /** true en production (lanely.fr) */
  isProd: import.meta.env.VITE_APP_ENV === "prod",
} as const

if (!config.apiBaseUrl) {
  // Garde-fou : une URL d'API manquante est presque toujours une erreur de config.
  console.warn(
    "[config] VITE_API_BASE_URL est vide - vérifiez le fichier .env du mode courant.",
  )
}
