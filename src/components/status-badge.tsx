import { useTranslation } from "react-i18next"
import { getStatusTokens, type DeliveryStatus } from "@/lib/colors"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: DeliveryStatus
  /** Surcharge du libellé (sinon libellé traduit via i18n). */
  label?: string
  className?: string
}

/**
 * Badge de statut de livraison basé sur la charte (src/lib/colors.ts).
 *
 * Respecte la règle d'accessibilité obligatoire : la pastille de couleur est
 * TOUJOURS accompagnée d'un libellé texte (jamais la couleur seule).
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { t } = useTranslation()
  const tokens = getStatusTokens(status)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}
    >
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: tokens.strong }}
      />
      {label ?? t(`status.${status}`)}
    </span>
  )
}
