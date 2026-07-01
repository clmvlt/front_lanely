import { getStatusTokens, type DeliveryStatus } from "@/lib/colors"
import type { ParcelStatus, WaybillStatus } from "@/features/waybills/types"
import type { TourStatus } from "@/features/tours/types"

/**
 * Tons de la charte (`src/lib/colors.ts`) appliqués aux statuts du module
 * transport. CANCELLED reste neutre (gris) pour le distinguer de FAILED (rouge).
 */
export const WAYBILL_TONE: Record<WaybillStatus, DeliveryStatus> = {
  DRAFT: "pending",
  ISSUED: "collected",
  COLLECTED: "collected",
  AT_DOCK: "dock",
  IN_TRANSIT: "transit",
  DELIVERED: "delivered",
  FAILED: "failed",
  CANCELLED: "pending",
}

export const TOUR_TONE: Record<TourStatus, DeliveryStatus> = {
  PLANNED: "pending",
  ASSIGNED: "collected",
  IN_PROGRESS: "transit",
  COMPLETED: "delivered",
  CANCELLED: "pending",
}

export const PARCEL_TONE: Record<ParcelStatus, DeliveryStatus> = {
  PENDING: "pending",
  LOADED: "collected",
  AT_DOCK: "dock",
  IN_TRANSIT: "transit",
  DELIVERED: "delivered",
  FAILED: "failed",
  CANCELLED: "pending",
}

/** Couleur forte (charte) d'un statut de lettre, pour les pastilles carte. */
export function waybillStatusColor(status: WaybillStatus): string {
  return getStatusTokens(WAYBILL_TONE[status]).strong
}
