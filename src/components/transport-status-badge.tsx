import { useTranslation } from "react-i18next"
import { StatusBadge } from "@/components/status-badge"
import {
  PARCEL_TONE,
  TOUR_TONE,
  WAYBILL_TONE,
} from "@/components/transport-status-tones"
import type { ParcelStatus, WaybillStatus } from "@/features/waybills/types"
import type { TourStatus } from "@/features/tours/types"

export function WaybillStatusBadge({
  status,
  className,
}: {
  status: WaybillStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <StatusBadge
      status={WAYBILL_TONE[status]}
      label={t(`waybills.status.${status}`)}
      className={className}
    />
  )
}

export function TourStatusBadge({
  status,
  className,
}: {
  status: TourStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <StatusBadge
      status={TOUR_TONE[status]}
      label={t(`tours.status.${status}`)}
      className={className}
    />
  )
}

export function ParcelStatusBadge({
  status,
  className,
}: {
  status: ParcelStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <StatusBadge
      status={PARCEL_TONE[status]}
      label={t(`waybills.parcelStatus.${status}`)}
      className={className}
    />
  )
}
