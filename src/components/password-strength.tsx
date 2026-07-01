import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { passwordScore } from "@/lib/password"

const LEVELS = [
  { key: "weak", color: "bg-status-failed" },
  { key: "fair", color: "bg-status-transit" },
  { key: "good", color: "bg-status-collected" },
  { key: "strong", color: "bg-status-delivered" },
] as const

interface PasswordStrengthProps {
  value: string
  className?: string
}

/** Jauge de robustesse (4 segments) affichée sous un champ mot de passe. */
export function PasswordStrength({ value, className }: PasswordStrengthProps) {
  const { t } = useTranslation()

  if (!value) return null

  const score = Math.max(1, passwordScore(value))
  const level = LEVELS[score - 1]

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex gap-1" aria-hidden>
        {LEVELS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? level.color : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("auth.passwordStrength.label")}:{" "}
        <span className="font-medium text-foreground">
          {t(`auth.passwordStrength.${level.key}`)}
        </span>
      </p>
    </div>
  )
}
