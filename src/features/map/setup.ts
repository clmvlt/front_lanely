import mapboxgl from "mapbox-gl"
import { config } from "@/lib/config"

/**
 * Initialisation unique de Mapbox GL pour tout le produit. Le jeton public est
 * centralisé dans `config.mapboxToken` (cf. CLAUDE.md). Tous les composants
 * carte passent par cette feature : ne jamais réinitialiser le jeton ailleurs.
 */
mapboxgl.accessToken = config.mapboxToken

export { mapboxgl }

/** Style Mapbox commun à toutes les cartes du produit. */
export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12"

/** Cadrage par défaut (France métropolitaine), avant tout `fitBounds`. */
export const DEFAULT_CENTER: [number, number] = [2.3522, 46.6034]
export const DEFAULT_ZOOM = 4.5
