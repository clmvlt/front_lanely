import i18n from "@/i18n"

function activeLocale(): string {
  return i18n.language || navigator.language
}

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

function parseInstant(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatInstant(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = parseInstant(iso)
  if (!date) return ""
  return new Intl.DateTimeFormat(activeLocale(), options).format(date)
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatInstant(iso, { dateStyle: "medium", timeStyle: "short" })
}

export function formatDate(iso: string | null | undefined): string {
  return formatInstant(iso, { dateStyle: "medium" })
}

export function formatTime(iso: string | null | undefined): string {
  return formatInstant(iso, { timeStyle: "short" })
}

export function formatCivilDate(plain: string | null | undefined): string {
  if (!plain) return ""
  const [year, month, day] = plain.split("-").map(Number)
  if (!year || !month || !day) return plain
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat(activeLocale(), {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date)
}

const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] =
  [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ]

export function formatRelative(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  const date = parseInstant(iso)
  if (!date) return ""
  const formatter = new Intl.RelativeTimeFormat(activeLocale(), {
    numeric: "auto",
  })
  let duration = (date.getTime() - now.getTime()) / 1000
  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return ""
}

export function toApiInstant(date: Date): string {
  return date.toISOString()
}

/** Date locale → valeur « YYYY-MM-DD » pour un `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * « YYYY-MM-DD » (jour local) → instant ISO-8601 UTC du DÉBUT de ce jour
 * (00:00 heure locale). Borne basse inclusive pour le filtre de liste.
 */
export function dateInputToStartInstant(value: string): string | null {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day, 0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * « YYYY-MM-DD » (jour local) → instant ISO-8601 UTC du début du JOUR SUIVANT
 * (borne haute exclusive : « ce jour inclus » = `[start, end)`).
 */
export function dateInputToEndInstant(value: string): string | null {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Valeur d'un `<input type="datetime-local">` (« YYYY-MM-DDTHH:mm » en heure
 * locale) → instant ISO-8601 UTC (`…Z`) attendu par l'API. Renvoie `null` si la
 * saisie est vide ou invalide.
 */
export function dateTimeLocalToInstant(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Instant ISO (ou maintenant par défaut) → valeur « YYYY-MM-DDTHH:mm » en heure
 * locale, pour préremplir un `<input type="datetime-local">`.
 */
export function instantToDateTimeLocal(
  iso?: string | null,
  fallback: Date = new Date(),
): string {
  const date = iso ? (parseInstant(iso) ?? fallback) : fallback
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
