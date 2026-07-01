import type {
  AccountType,
  AddressDto,
  CoordinateDto,
  LegalInfoDto,
  RouteInfoDto,
  StatusHistoryEntry,
  StatusHistoryParams,
} from "@/lib/transport-types"

export type {
  AccountType,
  AddressDto,
  CoordinateDto,
  LegalInfoDto,
  RouteInfoDto,
  StatusHistoryEntry,
  StatusHistoryParams,
}

// --- Énumérations (valeurs exactes échangées avec l'API) ---

export type WaybillStatus =
  | "DRAFT"
  | "ISSUED"
  | "COLLECTED"
  | "AT_DOCK"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"

/** Statut d'un colis (goods line). Indépendant du statut de la lettre. */
export type ParcelStatus =
  | "PENDING"
  | "LOADED"
  | "AT_DOCK"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED"

export type WaybillScope = "NATIONAL" | "INTERNATIONAL"

export type WaybillPartyRole = "SHIPPER" | "CONSIGNEE" | "CARRIER"

export type SignatureMethod = "DRAWN" | "TYPED" | "CLICKWRAP"

export const WAYBILL_STATUSES: WaybillStatus[] = [
  "DRAFT",
  "ISSUED",
  "COLLECTED",
  "AT_DOCK",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]

export const PARCEL_STATUSES: ParcelStatus[] = [
  "PENDING",
  "LOADED",
  "AT_DOCK",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]

export const WAYBILL_SCOPES: WaybillScope[] = ["NATIONAL", "INTERNATIONAL"]

export const SIGNATURE_METHODS: SignatureMethod[] = [
  "DRAWN",
  "TYPED",
  "CLICKWRAP",
]

/** Statuts où l'édition (PATCH) est autorisée. */
export const EDITABLE_WAYBILL_STATUSES: WaybillStatus[] = ["DRAFT", "ISSUED"]

// --- Inputs (DTO) ---

/**
 * Partie (expéditeur / destinataire / transporteur). Snapshot figé. `name`
 * toujours requis. Deux usages : saisie libre (remplir name/address/contact…)
 * ou client existant (renseigner clientId + clientAddressId).
 */
export interface WaybillPartyDto {
  name: string
  address?: AddressDto | null
  /** Si absent -> géocodage serveur de l'adresse. */
  location?: CoordinateDto | null
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  legalInfo?: LegalInfoDto | null
  clientId?: string | null
  clientAddressId?: string | null
}

/**
 * Point d'enlèvement / livraison. Trois modes (cf. doc API) :
 * - A (adresse libre) : `address` (+ `location` optionnel ; sinon géocodage).
 * - B (client) : `clientId` (+ `clientAddressId`) -> adresse + GPS repris du client.
 * - C (client + adresse custom) : `clientId` et `address` (l'adresse fournie
 *   écrase celle du client ; GPS = `location` ou géocodage de l'adresse custom).
 * `clientAddressId` requiert `clientId`. `address` prime toujours sur l'adresse
 * du client.
 */
export interface PlaceDto {
  address?: AddressDto | null
  location?: CoordinateDto | null
  clientId?: string | null
  clientAddressId?: string | null
  /** Instant ISO-8601 UTC. */
  plannedAt?: string | null
}

export interface RouteInputDto {
  distanceMeters?: number | null
  durationSeconds?: number | null
  geometryPolyline?: string | null
}

export interface GoodsLineDto {
  description: string
  packagingType?: string | null
  numberOfPackages?: number | null
  marksAndNumbers?: string | null
  grossWeightKg?: number | null
  volumeM3?: number | null
  /** Longueur en centimètres. */
  lengthCm?: number | null
  /** Largeur en centimètres. */
  widthCm?: number | null
  /** Hauteur en centimètres. */
  heightCm?: number | null
  dangerousGoods?: boolean | null
  unNumber?: string | null
}

export interface CreateWaybillRequest {
  reference?: string | null
  scope?: WaybillScope | null
  /** Donneur d'ordre : client pour le compte duquel le transport est réalisé. */
  clientId: string
  shipper: WaybillPartyDto
  consignee: WaybillPartyDto
  carrier?: WaybillPartyDto | null
  placeOfTakingOver?: PlaceDto | null
  placeOfDelivery?: PlaceDto | null
  goodsLines?: GoodsLineDto[] | null
  attachedDocuments?: string | null
  senderInstructions?: string | null
  carriageChargesAmount?: number | null
  carriageChargesCurrency?: string | null
  reservationsAndObservations?: string | null
  route?: RouteInputDto | null
  tourId?: string | null
  assignedAccountId?: string | null
  notes?: string | null
}

/** PATCH : tous champs optionnels ; fournir un bloc parties/goods le REMPLACE. */
export interface UpdateWaybillRequest {
  reference?: string | null
  scope?: WaybillScope | null
  /** Remplace le donneur d'ordre ; non vidable (null ignoré côté serveur). */
  clientId?: string | null
  shipper?: WaybillPartyDto | null
  consignee?: WaybillPartyDto | null
  carrier?: WaybillPartyDto | null
  placeOfTakingOver?: PlaceDto | null
  placeOfDelivery?: PlaceDto | null
  goodsLines?: GoodsLineDto[] | null
  attachedDocuments?: string | null
  senderInstructions?: string | null
  carriageChargesAmount?: number | null
  carriageChargesCurrency?: string | null
  reservationsAndObservations?: string | null
  route?: RouteInputDto | null
  notes?: string | null
}

export interface ChangeWaybillStatusRequest {
  status: WaybillStatus
  /** Requis si status = FAILED. */
  failureReason?: string | null
  /** Note libre journalisée dans l'historique (anomalie, précision…). */
  note?: string | null
  /** Position GPS du changement (signalement d'anomalie, surtout mobile). */
  latitude?: number | null
  longitude?: number | null
}

export interface ChangeParcelStatusRequest {
  status: ParcelStatus
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface SignatureDto {
  role: WaybillPartyRole
  signerName: string
  place?: string | null
  method?: SignatureMethod | null
}

export interface AssignWaybillRequest {
  tourId?: string | null
  positionInTour?: number | null
  assignedAccountId?: string | null
}

// --- Sorties ---

export type WaybillPartyResponse = WaybillPartyDto & { role: WaybillPartyRole }

export interface PlaceResponse {
  address?: AddressDto | null
  location?: CoordinateDto | null
  clientId?: string | null
  clientAddressId?: string | null
  plannedAt?: string | null
  actualAt?: string | null
}

export type GoodsLineResponse = GoodsLineDto & {
  id: string
  position: number
  status: ParcelStatus
  /** Entrée à quai (instant UTC). Null si la ligne n'y est jamais passée. */
  dockEnteredAt?: string | null
  /** Sortie de quai (instant UTC). Null tant que la ligne est à quai. */
  dockExitedAt?: string | null
}

export interface SignatureResponse {
  id: string
  role: WaybillPartyRole
  signerName: string
  signedAt: string
  place?: string | null
  method: SignatureMethod
  signatureImageUrl?: string | null
}

export interface WaybillResponse {
  id: string
  reference: string
  status: WaybillStatus
  scope: WaybillScope
  /** Donneur d'ordre. */
  clientId?: string | null
  clientName?: string | null
  shipper?: WaybillPartyResponse | null
  consignee?: WaybillPartyResponse | null
  carrier?: WaybillPartyResponse | null
  placeOfTakingOver?: PlaceResponse | null
  placeOfDelivery?: PlaceResponse | null
  goodsLines: GoodsLineResponse[]
  signatures: SignatureResponse[]
  attachedDocuments?: string | null
  senderInstructions?: string | null
  carriageChargesAmount?: number | null
  carriageChargesCurrency?: string | null
  reservationsAndObservations?: string | null
  tourId?: string | null
  positionInTour?: number | null
  assignedAccountId?: string | null
  assigneeType?: AccountType | null
  assigneeName?: string | null
  /** Trajet prise en charge -> livraison. */
  route?: RouteInfoDto | null
  failureReason?: string | null
  proofOfDeliveryImageUrl?: string | null
  notes?: string | null
  archived: boolean
  archivedAt?: string | null
  /** Entrée à quai (instant UTC). Null si jamais passé à quai. */
  dockEnteredAt?: string | null
  /** Sortie de quai (instant UTC). Null tant qu'à quai. */
  dockExitedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface WaybillSummaryResponse {
  id: string
  reference: string
  status: WaybillStatus
  scope: WaybillScope
  /** Nom du donneur d'ordre. */
  clientName?: string | null
  shipperName?: string | null
  consigneeName?: string | null
  /** Lieu de chargement (placeOfTakingOver). Coordonnées pour l'affichage carte. */
  pickupCity?: string | null
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  pickupPlannedAt?: string | null
  deliveryCity?: string | null
  deliveryLatitude?: number | null
  deliveryLongitude?: number | null
  deliveryPlannedAt?: string | null
  tourId?: string | null
  positionInTour?: number | null
  assignedAccountId?: string | null
  assigneeType?: AccountType | null
  assigneeName?: string | null
  archived: boolean
  archivedAt?: string | null
  /** Entrée à quai (instant UTC). Null si jamais passé à quai. */
  dockEnteredAt?: string | null
  /** Sortie de quai (instant UTC). Null tant qu'à quai. */
  dockExitedAt?: string | null
  createdAt: string
}

/**
 * Date pivot du filtre liste : chargement (prise en charge), livraison ou
 * entrée à quai (`DOCK` filtre sur `dockEnteredAt`).
 */
export type WaybillDateField = "PICKUP" | "DELIVERY" | "DOCK"

/**
 * Filtre archivage : `false`/absent = uniquement actives (défaut), `true` =
 * uniquement archivées, `"all"` = les deux.
 */
export type WaybillArchivedFilter = boolean | "all"

export interface ListWaybillsParams {
  /** Filtre multi-statuts (OR). Param `status` répétable côté API. */
  status?: WaybillStatus[]
  q?: string
  /** Filtre par donneur d'ordre (UUID) : ne renvoie que ses lettres de voiture. */
  clientId?: string
  tourId?: string
  assignedAccountId?: string
  archived?: WaybillArchivedFilter
  /** Sur quelle date planifiée filtrer (`dateFrom`/`dateTo`). Défaut serveur : PICKUP. */
  dateField?: WaybillDateField
  /** Borne inclusive (instant ISO-8601 UTC). */
  dateFrom?: string
  /** Borne exclusive (instant ISO-8601 UTC). */
  dateTo?: string
  page?: number
  size?: number
  /** Ex. "createdAt,desc". Tri sur reference/status/createdAt/updatedAt/pickupPlannedAt/deliveryPlannedAt/dockEnteredAt. */
  sort?: string
}

// --- Quai (marchandise « à quai ») ---

/**
 * Filtre de la vue dédiée « à quai » (`GET /companies/{id}/dock`). Renvoie les
 * lettres actuellement à quai (lettre `AT_DOCK` ou possédant au moins une ligne
 * `AT_DOCK`). Les archivées sont exclues côté serveur.
 */
export interface ListDockParams {
  /** Recherche libre (référence / noms des parties). */
  q?: string
  /** Filtre par donneur d'ordre (UUID). */
  clientId?: string
  /** Borne basse inclusive sur `dockEnteredAt` (instant ISO-8601 UTC). */
  dockFrom?: string
  /** Borne haute exclusive sur `dockEnteredAt` (instant ISO-8601 UTC). */
  dockTo?: string
  page?: number
  size?: number
  /** Conseillé : "dockEnteredAt,asc" (stock le plus ancien en premier). */
  sort?: string
}

/** Totaux agrégés de la marchandise à quai (`GET …/dock/summary`). */
export interface DockSummaryResponse {
  /** Nombre de lettres de voiture à quai. */
  waybillCount: number
  /** Somme des `numberOfPackages` des lignes à quai. */
  totalPackages: number
  /** Somme des `grossWeightKg` (kg). */
  totalGrossWeightKg: number
  /** Somme des `volumeM3` (m³). */
  totalVolumeM3: number
}

// --- Actions groupées (bulk) ---

/** Identifiant d'erreur stable renvoyé par item d'un lot. */
export type BulkErrorCode =
  | "WAYBILL_NOT_FOUND"
  | "FAILURE_REASON_REQUIRED"
  | "INVALID_TRANSITION"

export interface BulkItemError {
  code: BulkErrorCode
  /** Message déjà localisé (Accept-Language). */
  message: string
}

export interface BulkItemResult {
  id: string
  status: "OK" | "ERROR"
  error?: BulkItemError
}

export interface BulkResultResponse {
  succeeded: number
  failed: number
  results: BulkItemResult[]
}

export interface BulkStatusRequest {
  ids: string[]
  status: WaybillStatus
  /** Requis par item si status = FAILED. */
  failureReason?: string | null
  note?: string | null
}

export interface BulkArchiveRequest {
  ids: string[]
  /** true = archive, false = désarchive. */
  archived: boolean
}

export interface BulkCancelRequest {
  ids: string[]
  note?: string | null
}
