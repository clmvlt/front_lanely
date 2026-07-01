import type { PageResponse } from "@/lib/transport-types"

export type { PageResponse }

/**
 * Type de marchandise du catalogue d'une société. Sert uniquement à alimenter
 * l'auto-complétion à la saisie d'une ligne de marchandise dans une lettre de
 * voiture : aucune relation stockée avec les waybills (les valeurs sont juste
 * recopiées comme valeurs par défaut).
 */
export interface GoodsTypeResponse {
  id: string
  /** Nom / libellé d'auto-complétion (unique par société, insensible à la casse). */
  name: string
  description?: string | null
  packagingType?: string | null
  numberOfPackages?: number | null
  grossWeightKg?: number | null
  volumeM3?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  dangerousGoods: boolean
  unNumber?: string | null
  /** Instant ISO-8601 UTC. */
  createdAt: string
  /** Instant ISO-8601 UTC. */
  updatedAt: string
}

/** Création : seul `name` est requis, tout le reste est optionnel. */
export interface CreateGoodsTypeRequest {
  name: string
  description?: string | null
  packagingType?: string | null
  numberOfPackages?: number | null
  grossWeightKg?: number | null
  volumeM3?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  dangerousGoods?: boolean | null
  unNumber?: string | null
}

/**
 * PATCH : seuls les champs non-null sont appliqués. Pour effacer une valeur
 * optionnelle existante, envoyer une chaîne vide `""` (normalisée en null côté
 * serveur) plutôt que `null` (qui signifie « ne pas toucher »).
 */
export type UpdateGoodsTypeRequest = Partial<CreateGoodsTypeRequest>

export interface ListGoodsTypesParams {
  /** Recherche libre sur `name`/`description` (insensible à la casse). */
  q?: string
  page?: number
  size?: number
  /** Tri sur `name`/`createdAt`/`updatedAt` uniquement (ex. "name,asc"). */
  sort?: string
}
