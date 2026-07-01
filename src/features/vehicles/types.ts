// --- Énumérations (valeurs exactes échangées avec l'API) ---

export type VehicleType =
  | "TRUCK"
  | "VAN"
  | "CAR"
  | "TRAILER"
  | "SEMI_TRAILER"
  | "BUS"
  | "OTHER"

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

export type VehicleStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SOLD"
  | "OUT_OF_SERVICE"
  | "ARCHIVED"

export type DocumentCategory =
  | "REGISTRATION_CARD"
  | "INSURANCE"
  | "PHOTO"
  | "OTHER"

export const VEHICLE_TYPES: VehicleType[] = [
  "TRUCK",
  "VAN",
  "CAR",
  "TRAILER",
  "SEMI_TRAILER",
  "BUS",
  "OTHER",
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

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "SOLD",
  "OUT_OF_SERVICE",
  "ARCHIVED",
]

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "REGISTRATION_CARD",
  "INSURANCE",
  "PHOTO",
  "OTHER",
]

// --- Assurance ---

export interface InsuranceInfoDto {
  insurerName: string | null
  policyNumber: string | null
  coverageType: string | null
  /** Date civile YYYY-MM-DD. */
  startDate: string | null
  /** Date civile YYYY-MM-DD. */
  endDate: string | null
  contact: string | null
}

// --- Véhicule ---

export interface VehicleResponse {
  id: string
  registrationPlate: string
  vehicleType: VehicleType
  vin: string | null
  make: string | null
  model: string | null
  version: string | null
  fuelType: FuelType | null
  /** Date civile YYYY-MM-DD. */
  firstRegistrationDate: string | null
  emissionClass: string | null
  grossWeightKg: number | null
  payloadKg: number | null
  registrationCertificateNumber: string | null
  insurance: InsuranceInfoDto | null
  /** Date civile YYYY-MM-DD. */
  technicalInspectionDate: string | null
  /** Date civile YYYY-MM-DD. */
  roadTaxDueDate: string | null
  notes: string | null
  status: VehicleStatus
  latestMileageKm: number | null
  /** Instant ISO-8601 UTC. */
  latestMileageAt: string | null
  documents: VehicleDocumentResponse[]
  /** Instant ISO-8601 UTC. */
  createdAt: string
  /** Instant ISO-8601 UTC. */
  updatedAt: string
}

export interface VehicleSummaryResponse {
  id: string
  registrationPlate: string
  make: string | null
  model: string | null
  vehicleType: VehicleType
  status: VehicleStatus
  latestMileageKm: number | null
  /** Instant ISO-8601 UTC. */
  createdAt: string
}

export interface CreateVehicleInput {
  registrationPlate: string
  vehicleType: VehicleType
  vin?: string | null
  make?: string | null
  model?: string | null
  version?: string | null
  fuelType?: FuelType | null
  firstRegistrationDate?: string | null
  emissionClass?: string | null
  grossWeightKg?: number | null
  payloadKg?: number | null
  registrationCertificateNumber?: string | null
  insurance?: InsuranceInfoDto | null
  technicalInspectionDate?: string | null
  roadTaxDueDate?: string | null
  notes?: string | null
}

/**
 * PATCH : tous les champs optionnels, seuls les non-null sont appliqués.
 * Attention : fournir `insurance` REMPLACE entièrement l'assurance stockée,
 * toujours renvoyer le bloc complet.
 */
export type UpdateVehicleInput = Partial<CreateVehicleInput>

export interface ListVehiclesParams {
  status?: VehicleStatus
  type?: VehicleType
  q?: string
  page?: number
  size?: number
  /** Ex. "registrationPlate,asc" ou "createdAt,desc". */
  sort?: string
}

// --- Documents ---

export interface VehicleDocumentResponse {
  id: string
  category: DocumentCategory
  label: string | null
  originalFilename: string | null
  contentType: string
  sizeBytes: number
  /** URL relative protégée par le Bearer token. */
  downloadUrl: string
  uploadedByUserId: string | null
  /** Instant ISO-8601 UTC. */
  createdAt: string
}

export interface UploadDocumentInput {
  file: File
  category: DocumentCategory
  label?: string | null
}

// --- Relevés kilométriques ---

export interface MileageReadingResponse {
  id: string
  valueKm: number
  /** Instant ISO-8601 UTC. */
  recordedAt: string
  recordedByUserId: string | null
  note: string | null
  /** Instant ISO-8601 UTC. */
  createdAt: string
}

export interface CreateMileageReadingInput {
  valueKm: number
  /** Instant ISO-8601 UTC. */
  recordedAt: string
  note?: string | null
}

/**
 * Enveloppe paginée renvoyée par l'API véhicules (`page` = index 0-based).
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
