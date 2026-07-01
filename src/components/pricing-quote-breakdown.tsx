import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { formatCivilDate } from "@/lib/date"
import { formatFuelPrice, formatMoney, formatNumber } from "@/lib/money"
import { formatMoneyHT, formatUnitPrice } from "@/lib/pricing-format"
import { cn } from "@/lib/utils"
import type { QuoteLine, QuoteResponse } from "@/features/pricing"

/** Libellé localisé d'un avertissement (repli sur la clé brute si inconnue). */
function warningLabel(t: TFunction, key: string): string {
  return t(`pricing.warnings.${key}`, { defaultValue: key })
}

/** Clé stable d'une ligne (pour porter une surcharge de prix de l'estimation). */
function lineKey(line: QuoteLine, index: number): string {
  return line.componentId ?? `${line.label}#${index}`
}

interface PricingQuoteBreakdownProps {
  quote: QuoteResponse
  className?: string
  /** Rend les prix unitaires éditables (uniquement pour cette estimation). */
  editable?: boolean
  /** Prix unitaires surchargés, par clé de ligne. */
  overrides?: Record<string, number>
  /** Remonte une surcharge de prix (valeur `null` = retour au prix de la grille). */
  onOverrideChange?: (key: string, value: number | null) => void
}

/**
 * Détail d'un devis : lignes (BASE/SURCHARGE), sous-total, suppléments, total,
 * prix carburant retenu et avertissements. Partagé entre l'écran devis et la
 * carte tarification d'une lettre de voiture. En mode `editable`, les prix
 * unitaires sont modifiables et le total est recalculé localement, SANS toucher
 * la grille enregistrée (override propre à l'estimation courante).
 */
export function PricingQuoteBreakdown({
  quote,
  className,
  editable,
  overrides,
  onOverrideChange,
}: PricingQuoteBreakdownProps) {
  const { t } = useTranslation()
  const currency = quote.currency

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  // Lignes avec prix unitaire effectif (grille ou surcharge locale).
  const keyed = quote.lines.map((line, index) => {
    const key = lineKey(line, index)
    const override = overrides?.[key]
    return {
      line,
      key,
      unit: override ?? line.unitPrice,
      isOverridden: override != null,
    }
  })
  const hasOverride = keyed.some((k) => k.isOverridden)

  // Recalcul local quand au moins un prix est surchargé. Les lignes au % du
  // sous-total sont calculées après le sous-total (base).
  const lineTotals: Record<string, number> = {}
  let subtotal = quote.subtotal
  let surchargeTotal = quote.surchargeTotal
  let total = quote.total
  if (hasOverride) {
    const computed = keyed.map((k) => ({
      ...k,
      lt:
        k.line.basis === "PERCENT_OF_SUBTOTAL"
          ? null
          : k.unit * k.line.quantity,
    }))
    subtotal = computed
      .filter((k) => k.line.kind === "BASE" && k.lt != null)
      .reduce((sum, k) => sum + (k.lt as number), 0)
    const withPercent = computed.map((k) =>
      k.lt == null ? { ...k, lt: (subtotal * k.unit) / 100 } : k,
    )
    surchargeTotal = withPercent
      .filter((k) => k.line.kind === "SURCHARGE")
      .reduce((sum, k) => sum + (k.lt as number), 0)
    total = subtotal + surchargeTotal
    withPercent.forEach((k) => {
      lineTotals[k.key] = k.lt as number
    })
  }

  const startEdit = (key: string, unit: number) => {
    setEditingKey(key)
    setDraft(String(unit))
  }
  const commit = (key: string, original: number) => {
    const trimmed = draft.trim()
    const n = Number(trimmed)
    if (trimmed === "" || Number.isNaN(n) || n === original)
      onOverrideChange?.(key, null)
    else onOverrideChange?.(key, n)
    setEditingKey(null)
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2">
        {keyed.map(({ line, key, unit, isOverridden }) => {
          const displayTotal = hasOverride ? lineTotals[key] : line.lineTotal
          return (
            <div
              key={key}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-md border p-3"
            >
              <div className="min-w-0 grow basis-48">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-900">
                    {line.label}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium",
                      line.kind === "SURCHARGE"
                        ? "bg-[var(--status-transit-bg)] text-[var(--status-transit-text)]"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {t(`pricing.kind.${line.kind}`)}
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <span>
                    {t(`pricing.basis.${line.basis}`)} ·{" "}
                    {formatNumber(line.quantity, 3)} ×
                  </span>
                  {editable && editingKey === key ? (
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => commit(key, line.unitPrice)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commit(key, line.unitPrice)
                        if (e.key === "Escape") setEditingKey(null)
                      }}
                      className="h-6 w-24 rounded border border-input bg-background px-1.5 text-xs tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      aria-label={t("pricing.breakdown.editUnitPrice")}
                    />
                  ) : editable ? (
                    <button
                      type="button"
                      onClick={() => startEdit(key, unit)}
                      title={t("pricing.breakdown.editUnitPrice")}
                      className={cn(
                        "rounded px-1 underline decoration-dotted underline-offset-2 hover:text-foreground",
                        isOverridden && "font-medium text-primary",
                      )}
                    >
                      {formatUnitPrice(t, line.basis, unit, currency)}
                    </button>
                  ) : (
                    <span>
                      {formatUnitPrice(t, line.basis, unit, currency)}
                    </span>
                  )}
                  {editable && isOverridden && editingKey !== key && (
                    <button
                      type="button"
                      onClick={() => onOverrideChange?.(key, null)}
                      title={t("pricing.breakdown.resetUnitPrice")}
                      aria-label={t("pricing.breakdown.resetUnitPrice")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-neutral-900 tabular-nums">
                {formatMoney(displayTotal, currency)}
              </span>
            </div>
          )
        })}
      </div>

      <dl className="flex flex-col gap-1.5 border-t pt-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            {t("pricing.breakdown.subtotal")}
          </dt>
          <dd className="tabular-nums">{formatMoneyHT(subtotal, currency)}</dd>
        </div>
        {surchargeTotal > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">
              {t("pricing.breakdown.surchargeTotal")}
            </dt>
            <dd className="tabular-nums">
              {formatMoneyHT(surchargeTotal, currency)}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t pt-1.5 text-base font-semibold text-neutral-900">
          <dt>{t("pricing.breakdown.total")}</dt>
          <dd className="tabular-nums">{formatMoneyHT(total, currency)}</dd>
        </div>
        {hasOverride && (
          <p className="text-xs text-muted-foreground">
            {t("pricing.breakdown.overrideNote")}
          </p>
        )}
      </dl>

      {(quote.fuelPriceUsed != null || quote.fuelReferenceDate) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {quote.fuelPriceUsed != null && (
            <span>
              {t("pricing.breakdown.fuelPriceUsed")}:{" "}
              {formatFuelPrice(quote.fuelPriceUsed, currency)}
            </span>
          )}
          {quote.fuelReferenceDate && (
            <span>
              {t("pricing.breakdown.fuelReferenceDate")}:{" "}
              {formatCivilDate(quote.fuelReferenceDate)}
            </span>
          )}
        </div>
      )}

      {quote.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md border border-[var(--status-transit-text)]/30 bg-[var(--status-transit-bg)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-transit-text)]">
            <AlertTriangle className="size-3.5" />
            {t("pricing.breakdown.warningsTitle")}
          </p>
          <ul className="list-inside list-disc text-xs text-[var(--status-transit-text)]">
            {quote.warnings.map((w) => (
              <li key={w}>{warningLabel(t, w)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
