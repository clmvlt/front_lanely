import i18n from "@/i18n"

function activeLocale(): string {
  return i18n.language || navigator.language
}

/** Distance en mètres -> chaîne lisible (m en dessous de 1 km, sinon km). */
export function formatDistance(meters?: number | null): string {
  if (meters == null) return "-"
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km.toLocaleString(activeLocale(), {
    maximumFractionDigits: km < 10 ? 1 : 0,
  })} km`
}

/** Durée en secondes -> chaîne lisible (min, puis h + min). */
export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "-"
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
}
