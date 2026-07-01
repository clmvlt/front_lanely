import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { dockDwell, isDockDwellOverdue } from "@/lib/dock"

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Formate une durée (ms) sur ses deux plus grandes unités utiles. */
function formatDwell(t: TFunction, ms: number): string {
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)
  const parts: string[] = []
  if (days > 0) {
    parts.push(t("dock.dwell.days", { count: days }))
    if (hours > 0) parts.push(t("dock.dwell.hours", { count: hours }))
  } else if (hours > 0) {
    parts.push(t("dock.dwell.hours", { count: hours }))
    if (minutes > 0) parts.push(t("dock.dwell.minutes", { count: minutes }))
  } else {
    parts.push(t("dock.dwell.minutes", { count: minutes }))
  }
  return parts.join(" ")
}

/**
 * Badge « à quai depuis … » (stock dormant). Séjour en cours dépassant le seuil
 * d'alerte -> ambre ; sinon ton « quai » (indigo). Rien si la durée n'est pas
 * calculable.
 */
export function DockDwellBadge({
  status,
  dockEnteredAt,
  dockExitedAt,
  className,
}: {
  status: string
  dockEnteredAt?: string | null
  dockExitedAt?: string | null
  className?: string
}) {
  const { t } = useTranslation()
  const dwell = dockDwell(status, dockEnteredAt, dockExitedAt)
  if (!dwell) return null

  const duration = formatDwell(t, dwell.ms)
  const label = dwell.ongoing
    ? t("dock.dwell.since", { duration })
    : t("dock.dwell.stayed", { duration })
  const overdue = isDockDwellOverdue(dwell)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={
        overdue
          ? {
              backgroundColor: "var(--status-transit-bg)",
              color: "var(--status-transit-text)",
            }
          : {
              backgroundColor: "var(--status-dock-bg)",
              color: "var(--status-dock-text)",
            }
      }
      title={overdue ? t("dock.dwell.overdue") : undefined}
    >
      <Clock className="size-3" />
      {label}
    </span>
  )
}
