import type {
  AccountType,
  AddressDto,
  CoordinateDto,
  RouteInfoDto,
  StatusHistoryEntry,
  StatusHistoryParams,
} from "@/lib/transport-types"
import type { WaybillSummaryResponse } from "@/features/waybills/types"

export type {
  AccountType,
  AddressDto,
  CoordinateDto,
  RouteInfoDto,
  StatusHistoryEntry,
  StatusHistoryParams,
}

/** Visite écartée de l'optimisation d'une tournée (non rattachable / trop loin). */
export interface SkippedVisit {
  visitId: string
  name?: string | null
  reason: "UNROUTABLE" | "TOO_FAR"
  snapDistanceMeters?: number | null
}

// --- Énumérations ---

export type TourStatus =
  | "PLANNED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"

export const TOUR_STATUSES: TourStatus[] = [
  "PLANNED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]

/** États terminaux : l'édition/réordonnancement des arrêts y est bloqué. */
export const TERMINAL_TOUR_STATUSES: TourStatus[] = ["COMPLETED", "CANCELLED"]

// --- Inputs ---

export interface CreateTourRequest {
  reference?: string | null
  name: string
  /** Date civile yyyy-MM-dd. */
  plannedDate?: string | null
  /** Défaut = adresse de facturation de la société. */
  depot?: AddressDto | null
  /** Sinon géocodé serveur. */
  depotLocation?: CoordinateDto | null
  vehicleId?: string | null
  assignedAccountId?: string | null
  notes?: string | null
}

export interface UpdateTourRequest {
  name?: string | null
  plannedDate?: string | null
  depot?: AddressDto | null
  depotLocation?: CoordinateDto | null
  notes?: string | null
}

export interface AssignTourRequest {
  vehicleId?: string | null
  assignedAccountId?: string | null
}

/** Liste ordonnée complète : les lettres absentes sont détachées. */
export interface SetTourWaybillsRequest {
  waybillIds: string[]
}

export interface ChangeTourStatusRequest {
  status: TourStatus
  /** Note libre journalisée dans l'historique. */
  note?: string | null
  /** Position GPS du changement (signalement d'anomalie, surtout mobile). */
  latitude?: number | null
  longitude?: number | null
}

export interface RoutePreviewRequest {
  waybillIds: string[]
}

// --- Sorties ---

export interface TourResponse {
  id: string
  reference: string
  name: string
  status: TourStatus
  assignedAccountId?: string | null
  assigneeType?: AccountType | null
  assigneeName?: string | null
  vehicleId?: string | null
  depot?: AddressDto | null
  depotLocation?: CoordinateDto | null
  plannedDate?: string | null
  startedAt?: string | null
  completedAt?: string | null
  /** Trajet complet dépôt -> arrêts -> dépôt. */
  route?: RouteInfoDto | null
  lastOptimizedAt?: string | null
  /** Arrêts, ordonnés par positionInTour. */
  waybills: WaybillSummaryResponse[]
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface TourSummaryResponse {
  id: string
  reference: string
  name: string
  status: TourStatus
  assignedAccountId?: string | null
  assigneeType?: AccountType | null
  assigneeName?: string | null
  vehicleId?: string | null
  plannedDate?: string | null
  distanceMeters?: number | null
  durationSeconds?: number | null
  createdAt: string
}

export interface TourOptimizeResponse {
  tour: TourResponse
  skippedVisits: SkippedVisit[]
}

export interface RoutePreviewResponse {
  orderedWaybillIds: string[]
  distanceMeters?: number | null
  durationSeconds?: number | null
  geometryPolyline?: string | null
}

export interface ListToursParams {
  status?: TourStatus
  /** Date civile yyyy-MM-dd. */
  date?: string
  assignedAccountId?: string
  q?: string
  page?: number
  size?: number
  /** Tri sur reference/name/status/plannedDate/createdAt/updatedAt. */
  sort?: string
}
