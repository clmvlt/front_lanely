import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type { TariffStatus } from "@/features/pricing"

const TONE: Record<TariffStatus, string> = {
  DRAFT: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  ACTIVE: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
}

export function TariffStatusBadge({
  status,
  className,
}: {
  status: TariffStatus
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        TONE[status],
        className,
      )}
    >
      {t(`pricing.status.${status}`)}
    </span>
  )
}
