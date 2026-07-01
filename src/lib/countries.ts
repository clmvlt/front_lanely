/**
 * Codes pays ISO 3166-1 alpha-2. Les libellés sont résolus à l'affichage via
 * `Intl.DisplayNames` dans la langue active - pas de noms codés en dur (i18n).
 */
export const DEFAULT_COUNTRY = "FR"

export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU",
  "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL",
  "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ", "CA", "CC",
  "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV",
  "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG",
  "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD",
  "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT",
  "GU", "GW", "GY", "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM",
  "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK",
  "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR",
  "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR",
  "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC",
  "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL",
  "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY",
  "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
  "ZM", "ZW",
] as const

/**
 * Pays principalement francophones → langue par défaut "fr". Tout autre pays
 * (ou pays inconnu) retombe sur "en". Sert à pré-remplir une préférence de
 * langue à partir du pays d'une société. Restreint aux langues supportées par
 * l'app (cf. `supportedLanguages`).
 */
const FRENCH_SPEAKING_COUNTRIES = new Set([
  "FR", "BE", "CH", "LU", "MC", "CA", // Europe / Amérique du Nord
  "BJ", "BF", "BI", "CD", "CG", "CI", "CM", "DJ", "GA", "GN", "GQ", "KM",
  "ML", "NE", "RW", "SN", "TD", "TG", // Afrique
  "GF", "GP", "MQ", "NC", "PF", "RE", "YT", "BL", "MF", "PM", "WF", "VU",
  "HT", "MG", "SC", "MU", // Outre-mer & océan Indien
])

/** Langue supportée par défaut ("en" | "fr") pour un code pays donné. */
export function languageForCountry(
  code: string | null | undefined,
): "en" | "fr" {
  if (!code) return "en"
  return FRENCH_SPEAKING_COUNTRIES.has(code.toUpperCase()) ? "fr" : "en"
}

/** Libellé localisé d'un code pays (repli sur le code brut si inconnu). */
export function countryName(code: string, lang: string): string {
  const upper = code.toUpperCase()
  try {
    const display = new Intl.DisplayNames([lang], { type: "region" })
    return display.of(upper) ?? upper
  } catch {
    return upper
  }
}

/** Liste { code, name } triée par libellé localisé pour un sélecteur. */
export function sortedCountries(
  lang: string,
): Array<{ code: string; name: string }> {
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang))
}
