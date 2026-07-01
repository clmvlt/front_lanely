/**
 * Tarification par société et indexation carburant. Une société porte 0..N
 * grilles (`Tariff`) ; une grille porte des composants facturables ordonnés et,
 * optionnellement, une politique carburant. Voir `src/features/README.md`.
 */

// --- Énumérations (valeurs exactes échangées avec l'API) ---

/** Unité de facturation qui pilote la quantité d'un composant. */
export type PricingBasis =
  | "FLAT"
  | "PER_KM"
  | "PER_KG"
  | "PER_M3"
  | "PER_PACKAGE"
  | "PER_STOP"
  | "PER_WAYBILL"
  | "PERCENT_OF_SUBTOTAL"

/** Un composant BASE alimente le sous-total ; un SURCHARGE le supplément. */
export type ComponentKind = "BASE" | "SURCHARGE"

/**
 * Cycle de vie d'une grille. Seule une grille ACTIVE est utilisée au calcul ;
 * DRAFT couvre le brouillon comme la grille désactivée (réactivable).
 */
export type TariffStatus = "DRAFT" | "ACTIVE"

/** Mode de supplément carburant d'une grille. */
export type FuelSurchargeMode = "THRESHOLD_COMPONENTS" | "INDEXED_PERCENT"

export type FuelType =
  | "DIESEL"
  | "PETROL"
  | "ELECTRIC"
  | "HYBRID"
  | "PLUGIN_HYBRID"
  | "LPG"
  | "CNG"
  | "HYDROGEN"
  | "OTHER"

/** Mode d'arrondi (java.math.RoundingMode). */
export type RoundingMode =
  | "HALF_UP"
  | "HALF_EVEN"
  | "UP"
  | "DOWN"
  | "CEILING"
  | "FLOOR"
  | "HALF_DOWN"
  | "UNNECESSARY"

export const PRICING_BASES: PricingBasis[] = [
  "FLAT",
  "PER_KM",
  "PER_KG",
  "PER_M3",
  "PER_PACKAGE",
  "PER_STOP",
  "PER_WAYBILL",
  "PERCENT_OF_SUBTOTAL",
]

export const COMPONENT_KINDS: ComponentKind[] = ["BASE", "SURCHARGE"]

export const TARIFF_STATUSES: TariffStatus[] = ["DRAFT", "ACTIVE"]

export const FUEL_SURCHARGE_MODES: FuelSurchargeMode[] = [
  "THRESHOLD_COMPONENTS",
  "INDEXED_PERCENT",
]

export const FUEL_TYPES: FuelType[] = [
  "DIESEL",
  "PETROL",
  "ELECTRIC",
  "HYBRID",
  "PLUGIN_HYBRID",
  "LPG",
  "CNG",
  "HYDROGEN",
  "OTHER",
]

export const ROUNDING_MODES: RoundingMode[] = [
  "HALF_UP",
  "HALF_EVEN",
  "UP",
  "DOWN",
  "CEILING",
  "FLOOR",
  "HALF_DOWN",
  "UNNECESSARY",
]

/**
 * Sentinelle à envoyer dans `clientId` d'un `UpdateTariffRequest` pour détacher
 * la grille de son client (la rendre grille société). Un `null` laisserait le
 * champ inchangé (PATCH partiel).
 */
export const DETACH_CLIENT_ID = "00000000-0000-0000-0000-000000000000"

// --- Composants (lignes facturables) ---

export interface TariffComponentDto {
  id: string
  position: number
  label: string
  basis: PricingBasis
  kind: ComponentKind
  unitPrice: number
  includedQuantity?: number | null
  minQuantity?: number | null
  maxQuantity?: number | null
  minAmount?: number | null
  maxAmount?: number | null
}

export interface CreateTariffComponentRequest {
  /** Position dans la grille ; ajouté en fin si omis. */
  position?: number | null
  label: string
  basis: PricingBasis
  /** >= 0, jusqu'à 4 décimales (un % si `basis` = PERCENT_OF_SUBTOTAL). */
  unitPrice: number
  /** Franchise : quantité offerte avant facturation. */
  includedQuantity?: number | null
  minQuantity?: number | null
  maxQuantity?: number | null
  /** Plancher du total de la ligne. */
  minAmount?: number | null
  /** Plafond du total de la ligne. */
  maxAmount?: number | null
}

/** Champs `null`/absents ignorés (PATCH partiel). */
export type UpdateTariffComponentRequest = Partial<CreateTariffComponentRequest>

// --- Politique carburant ---

export interface FuelSurchargeComponentDto {
  id: string
  position: number
  label: string
  basis: PricingBasis
  unitPrice: number
  includedQuantity?: number | null
  minQuantity?: number | null
  maxQuantity?: number | null
  minAmount?: number | null
  maxAmount?: number | null
}

/** Ligne de supplément carburant en entrée (mode THRESHOLD_COMPONENTS). */
export interface FuelSurchargeComponentInput {
  label: string
  basis: PricingBasis
  unitPrice: number
  position?: number | null
  includedQuantity?: number | null
  minQuantity?: number | null
  maxQuantity?: number | null
  minAmount?: number | null
  maxAmount?: number | null
}

export interface FuelSurchargePolicyResponse {
  id: string
  enabled: boolean
  fuelType: FuelType
  mode: FuelSurchargeMode
  /** €/L. Renseigné en mode THRESHOLD_COMPONENTS. */
  thresholdPrice?: number | null
  /** €/L de référence. Renseigné en mode INDEXED_PERCENT. */
  referencePrice?: number | null
  /** Part gazole 0..1. Renseigné en mode INDEXED_PERCENT. */
  dieselShareRatio?: number | null
  clampAtZero: boolean
  sourceFilter?: string | null
  surchargeComponents: FuelSurchargeComponentDto[]
}

/**
 * Définit ou remplace la politique carburant d'une grille. Règles :
 * THRESHOLD_COMPONENTS -> `thresholdPrice` requis ; INDEXED_PERCENT ->
 * `referencePrice` + `dieselShareRatio` requis (sinon 400 `error.fuel.policy.invalid`).
 */
export interface UpsertFuelSurchargePolicyRequest {
  enabled: boolean
  fuelType: FuelType
  mode: FuelSurchargeMode
  thresholdPrice?: number | null
  referencePrice?: number | null
  dieselShareRatio?: number | null
  /** Plancher à 0 si le prix baisse sous la référence. Défaut serveur `true`. */
  clampAtZero?: boolean | null
  /** Épingler une source de prix (ex. "data.economie.gouv.fr"). */
  sourceFilter?: string | null
  /** Suppléments appliqués au-dessus du seuil (mode THRESHOLD_COMPONENTS). */
  surchargeComponents?: FuelSurchargeComponentInput[]
}

// --- Grilles tarifaires ---

export interface CreateTariffRequest {
  name: string
  description?: string | null
  /** ISO 4217, 3 lettres. Défaut serveur "EUR". */
  currency?: string | null
  /** Grille par défaut société. Incompatible avec `clientId`. */
  isDefault?: boolean | null
  /** UUID d'un client de la société pour une grille spécifique. */
  clientId?: string | null
  /** Date civile YYYY-MM-DD. */
  validFrom?: string | null
  validUntil?: string | null
  roundingMode?: RoundingMode | null
  /** Nombre de décimales d'arrondi 0..6. Défaut serveur 2. */
  roundingScale?: number | null
  /** Minimum de perception. */
  minChargeAmount?: number | null
}

/**
 * Mise à jour partielle. Pour détacher le client (rendre la grille société),
 * envoyer `clientId` = {@link DETACH_CLIENT_ID}.
 */
export type UpdateTariffRequest = Partial<CreateTariffRequest>

export interface TariffSummaryResponse {
  id: string
  name: string
  currency: string
  isDefault: boolean
  status: TariffStatus
  clientId?: string | null
  validFrom?: string | null
  validUntil?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface TariffResponse {
  id: string
  name: string
  description?: string | null
  currency: string
  isDefault: boolean
  status: TariffStatus
  clientId?: string | null
  validFrom?: string | null
  validUntil?: string | null
  roundingMode: RoundingMode
  roundingScale: number
  minChargeAmount?: number | null
  components: TariffComponentDto[]
  fuelSurcharge?: FuelSurchargePolicyResponse | null
  createdAt: string
  updatedAt: string
}

export interface ListTariffsParams {
  status?: TariffStatus
  clientId?: string
  page?: number
  size?: number
  /** Ex. "name,asc". Tri sur name/status/createdAt/updatedAt. */
  sort?: string
}

// --- Prix carburant ---

/**
 * Carburants réellement indexés par la source open-data (data.economie.gouv.fr) :
 * seuls ceux-ci portent un prix exploitable (current/history/politique carburant).
 * PETROL = essence SP95-E10, OTHER = superéthanol E85. Les autres valeurs de
 * `FuelType` existent côté enum mais n'ont jamais d'index (404).
 */
export const INDEXED_FUEL_TYPES: FuelType[] = [
  "DIESEL",
  "PETROL",
  "LPG",
  "OTHER",
]

export interface FuelPriceResponse {
  id: string
  fuelType: FuelType
  /** €/L, jusqu'à 4 décimales. */
  price: number
  currency: string
  /** Date civile de référence YYYY-MM-DD. */
  referenceDate: string
  source: string
  /** Instant ISO-8601 UTC d'ingestion. */
  fetchedAt: string
}

export interface RefreshFuelPricesResponse {
  source: string
  /** Nombre de prix ingérés. */
  ingested: number
  refreshedAt: string
}

export interface CurrentFuelPriceParams {
  /** Défaut serveur DIESEL. */
  fuelType?: FuelType
  source?: string
}

export interface FuelPriceHistoryParams {
  fuelType?: FuelType
  source?: string
  /** Borne basse (date civile YYYY-MM-DD). */
  from?: string
  to?: string
  page?: number
  size?: number
  sort?: string
}

// --- Devis & application sur waybill ---

/** Quantités ad-hoc pour un devis (ignorées si `waybillId` fourni). */
export interface QuoteInputs {
  distanceKm?: number | null
  totalWeightKg?: number | null
  totalVolumeM3?: number | null
  packageCount?: number | null
  stopCount?: number | null
}

/**
 * Estimation de prix. Soit `waybillId` (quantités + client lus du bordereau),
 * soit `inputs` ad-hoc (+ éventuel `clientId` pour résoudre la grille).
 * `tariffId` force une grille précise.
 */
export interface QuoteRequest {
  waybillId?: string | null
  tariffId?: string | null
  clientId?: string | null
  inputs?: QuoteInputs | null
}

export interface QuoteLine {
  /** Nul pour une ligne dérivée (ex. supplément carburant indexé). */
  componentId?: string | null
  label: string
  basis: PricingBasis
  kind: ComponentKind
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface QuoteResponse {
  tariffId: string
  tariffName: string
  currency: string
  lines: QuoteLine[]
  /** Somme des lignes BASE. */
  subtotal: number
  /** Somme des lignes SURCHARGE. */
  surchargeTotal: number
  /** Après minimum de perception et arrondi. */
  total: number
  /** €/L retenu, ou null si aucune politique / aucun index. */
  fuelPriceUsed?: number | null
  fuelReferenceDate?: string | null
  /** Clés i18n non bloquantes (ex. "error.pricing.route-not-computed"). */
  warnings: string[]
}

/** `tariffId` force une grille ; sinon résolution client du waybill -> défaut. */
export interface RecalculateWaybillPriceRequest {
  tariffId?: string | null
}
