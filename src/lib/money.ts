import i18n from "@/i18n"

function activeLocale(): string {
  return i18n.language || navigator.language
}

/** Montant -> chaîne monétaire localisée (2 décimales). "" si nul. */
export function formatMoney(
  amount: number | null | undefined,
  currency = "EUR",
): string {
  if (amount === null || amount === undefined) return ""
  return new Intl.NumberFormat(activeLocale(), {
    style: "currency",
    currency,
  }).format(amount)
}

/** Nombre localisé avec un nombre de décimales borné (quantités, ratios). */
export function formatNumber(
  value: number | null | undefined,
  maxFractionDigits = 2,
): string {
  if (value === null || value === undefined) return ""
  return new Intl.NumberFormat(activeLocale(), {
    maximumFractionDigits: maxFractionDigits,
  }).format(value)
}

/** Prix au litre (€/L, 4 décimales) localisé. */
export function formatFuelPrice(
  price: number | null | undefined,
  currency = "EUR",
): string {
  if (price === null || price === undefined) return ""
  return new Intl.NumberFormat(activeLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price)
}
