import type { MarkerStyle, MarkerTone } from "./markers"

/**
 * Un point GPS affiché sur une carte (marqueur). Brique de base partagée par
 * toutes les vues : itinéraires, sélecteur de point, suivi de tournée...
 */
export interface MapPoint {
  latitude: number
  longitude: number
  /** Rôle prédéfini (couleur/forme), ex. "depot", "pickup", "delivery". */
  tone?: MarkerTone
  /** Numéro affiché dans la pastille (1-based), ex. ordre d'un arrêt. */
  index?: number
  /** Libellé (tooltip natif au survol, titre de la popup au clic). */
  title?: string
  /** Détail affiché dans la popup au clic (ex. adresse complète). */
  description?: string
  /** Surcharges fines du style (couleur, taille, forme, bordure...). */
  style?: MarkerStyle
}
