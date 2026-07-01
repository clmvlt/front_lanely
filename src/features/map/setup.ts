import mapboxgl from "mapbox-gl"
import { config } from "@/lib/config"

/**
 * Initialisation unique de Mapbox GL pour tout le produit. Le jeton public est
 * centralisé dans `config.mapboxToken` (cf. CLAUDE.md). Tous les composants
 * carte passent par cette feature : ne jamais réinitialiser le jeton ailleurs.
 */
mapboxgl.accessToken = config.mapboxToken

/**
 * true si un jeton Mapbox est configuré. Sans jeton, Mapbox GL lève une erreur
 * à la création de la carte : les composants basculent alors en mode dégradé
 * (`map.unavailable`) plutôt que de planter le rendu.
 */
export const isMapConfigured = Boolean(config.mapboxToken)

if (!isMapConfigured) {
  console.warn(
    "[map] VITE_MAPBOX_TOKEN est vide - les cartes s'affichent en mode dégradé. Renseignez le jeton dans le fichier .env du mode courant.",
  )
}

export { mapboxgl }

/** Style Mapbox commun à toutes les cartes du produit. */
export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12"

/** Cadrage par défaut (France métropolitaine), avant tout `fitBounds`. */
export const DEFAULT_CENTER: [number, number] = [2.3522, 46.6034]
export const DEFAULT_ZOOM = 4.5
