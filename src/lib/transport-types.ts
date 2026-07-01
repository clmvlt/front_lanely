/**
 * DTO primitifs partagés par le module transport (lettres de voiture, tournées,
 * itinéraire/géocodage). Centralisés ici pour éviter qu'un domaine importe les
 * types d'un autre (cf. `src/features/README.md`).
 */

/** Adresse postale. `country` = ISO 3166-1 alpha-2 (défaut serveur "FR"). */
export interface AddressDto {
  line1?: string | null
  line2?: string | null
  postalCode?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

/** Informations légales (surtout CMR international : VAT/SIRET…). */
export interface LegalInfoDto {
  legalName?: string | null
  registrationNumber?: string | null
  vatNumber?: string | null
  legalForm?: string | null
}

/** Coordonnées WGS84 : latitude ET longitude ensemble, ou aucune des deux. */
export interface CoordinateDto {
  latitude: number
  longitude: number
}

/** Trajet calculé (cache serveur). Champs nuls tant que non calculé. */
export interface RouteInfoDto {
  distanceMeters?: number | null
  durationSeconds?: number | null
  /** Polyline encodée (précision 5, ordre [lat, lon]). Voir `@/lib/polyline`. */
  geometryPolyline?: string | null
  computedAt?: string | null
}

/**
 * Enveloppe paginée du module transport (`page` = index 0-based, distincte du
 * `number` Spring Data brut).
 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

// --- Historique de statut (partagé lettres de voiture / colis / tournées) ---

/** Nature du compte ayant déclenché un changement de statut. */
export type AccountType = "USER" | "PROFILE"

/**
 * Auteur d'un changement de statut. `id` est nul si le compte a depuis été
 * supprimé ; `name` est un snapshot figé au moment du changement.
 */
export interface StatusActor {
  id?: string | null
  type: AccountType
  name: string
}

/**
 * Entrée d'historique de statut. `fromStatus` est nul pour l'entrée initiale
 * créée avec la ressource. `latitude`/`longitude` accompagnent un signalement
 * d'anomalie (surtout mobile). Les statuts arrivent en codes anglais : c'est au
 * front de les localiser. Trié `changedAt` décroissant côté API.
 */
export interface StatusHistoryEntry {
  id: string
  fromStatus?: string | null
  toStatus: string
  actor: StatusActor
  note?: string | null
  latitude?: number | null
  longitude?: number | null
  /** Instant ISO-8601 UTC. */
  changedAt: string
}

/** Pagination d'un historique de statut (défaut serveur : `changedAt,desc`). */
export interface StatusHistoryParams {
  page?: number
  size?: number
}

/**
 * Indique si passer de `from` à `to` est un retour en arrière, d'après l'ordre
 * nominal `order` (la liste des statuts de l'enum, du moins au plus avancé). Sert
 * à demander confirmation (ex. DELIVERED -> COLLECTED). Tout changement reste
 * autorisé côté API ; ce n'est qu'un garde-fou d'interface. Renvoie `false` si
 * l'un des statuts est inconnu de `order`.
 */
export function isBackwardStatusChange(
  order: readonly string[],
  from: string,
  to: string,
): boolean {
  const fromIndex = order.indexOf(from)
  const toIndex = order.indexOf(to)
  if (fromIndex === -1 || toIndex === -1) return false
  return toIndex < fromIndex
}
