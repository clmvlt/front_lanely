import type { TFunction } from "i18next"
import i18n from "@/i18n"
import { formatMoney, formatNumber } from "@/lib/money"
import type { PricingBasis } from "@/features/pricing"

/** Libellé « hors taxes » localisé (HT / excl. tax). */
export function taxExcludedLabel(): string {
  return i18n.t("common.taxExcluded")
}

/** Montant hors taxes formaté, suffixé du libellé HT. "" si nul. */
export function formatMoneyHT(
  amount: number | null | undefined,
  currency = "EUR",
): string {
  const formatted = formatMoney(amount, currency)
  return formatted ? `${formatted} ${taxExcludedLabel()}` : formatted
}

/** Prix unitaire formaté avec son unité (€/km, %, etc.), prix hors taxes. */
export function formatUnitPrice(
  t: TFunction,
  basis: PricingBasis,
  unitPrice: number,
  currency: string,
): string {
  if (basis === "PERCENT_OF_SUBTOTAL") {
    return `${formatNumber(unitPrice, 2)} %`
  }
  const unit = t(`pricing.basisUnit.${basis}`)
  return `${formatMoney(unitPrice, currency)}${unit ? ` ${unit}` : ""} ${t("common.taxExcluded")}`
}
