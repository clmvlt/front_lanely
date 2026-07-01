import { useState } from "react"
import { useTranslation } from "react-i18next"
import { BadgeEuro, Calculator } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PricingQuoteBreakdown } from "@/components/pricing-quote-breakdown"
import { getErrorMessage } from "@/lib/api-error"
import { formatMoneyHT } from "@/lib/pricing-format"
import {
  useRecalculateWaybillPrice,
  type QuoteResponse,
} from "@/features/pricing"

interface WaybillPricingCardProps {
  companyId: string
  waybillId: string
  status: string
  amount?: number | null
  currency?: string | null
  canManage: boolean
}

/**
 * Carte tarification d'une lettre de voiture : montant courant + bouton de
 * recalcul automatique (POST .../pricing/recalculate) avec détail du devis.
 */
export function WaybillPricingCard({
  companyId,
  waybillId,
  status,
  amount,
  currency,
  canManage,
}: WaybillPricingCardProps) {
  const { t } = useTranslation()
  const recalc = useRecalculateWaybillPrice(companyId, waybillId)
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const isCancelled = status === "CANCELLED"

  const handleRecalculate = async () => {
    try {
      const result = await recalc.mutateAsync(undefined)
      setQuote(result)
      setShowBreakdown(true)
    } catch {
      /* erreur affichée via recalc.error */
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BadgeEuro className="size-4" />
            {t("pricing.waybillCard.title")}
          </h2>
          {canManage && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              loading={recalc.isPending}
            >
              <Calculator />
              {t("pricing.waybillCard.recalculate")}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs text-muted-foreground">
            {t("pricing.waybillCard.current")}
          </span>
          {amount != null ? (
            <span className="text-lg font-semibold text-neutral-900 tabular-nums">
              {formatMoneyHT(amount, currency ?? "EUR")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("pricing.waybillCard.notSet")}
            </span>
          )}
        </div>

        {recalc.isSuccess && (
          <p className="text-xs text-[var(--status-delivered-text)]">
            {t("pricing.waybillCard.recalculated")}
          </p>
        )}
        {recalc.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(recalc.error)}</AlertDescription>
          </Alert>
        )}

        {quote && (
          <div className="flex flex-col gap-3">
            <Button
              variant="link"
              size="sm"
              className="w-fit px-0"
              onClick={() => setShowBreakdown((prev) => !prev)}
            >
              {showBreakdown
                ? t("pricing.waybillCard.hideBreakdown")
                : t("pricing.waybillCard.viewBreakdown")}
            </Button>
            {showBreakdown && <PricingQuoteBreakdown quote={quote} />}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {isCancelled
            ? t("pricing.waybillCard.notApplicable")
            : t("pricing.waybillCard.manualHint")}
        </p>
      </CardContent>
    </Card>
  )
}
