import { brand, neutral, status } from "@/lib/colors"

/**
 * Rôles de points GPS prédéfinis. Chaque rôle fixe une couleur/forme cohérente
 * dans tout le produit (carte d'itinéraire, sélecteur de point, suivi...).
 */
export type MarkerTone = "depot" | "stop" | "pickup" | "delivery" | "default"

/**
 * Forme d'un marqueur :
 * - `pin` : repère GPS classique (goutte d'eau, pointe en bas sur le point) ;
 * - `round` / `square` : pastille (utile pour un arrêt numéroté).
 */
export type MarkerShape = "pin" | "round" | "square"

/**
 * Pictogramme dessiné au centre d'un `pin` (à la place du point central) pour
 * distinguer un lieu particulier. `warehouse` = dépôt de l'entreprise.
 */
export type MarkerIcon = "warehouse"

/** Paramètres de style d'un marqueur de point GPS. Tout est optionnel. */
export interface MarkerStyle {
  /** Couleur de remplissage du repère. */
  color?: string
  /** Couleur du numéro/texte (et du point central d'un `pin`). Défaut blanc. */
  textColor?: string
  /** Couleur de la bordure. Défaut blanc. */
  borderColor?: string
  /** Taille de référence en px (largeur). Défaut 28. */
  size?: number
  /** Forme du repère. Défaut `pin` (repère GPS). */
  shape?: MarkerShape
  /** Pictogramme central (prioritaire sur le point/numéro). Défaut aucun. */
  icon?: MarkerIcon | null
}

/**
 * Préréglages de style par rôle. Les couleurs viennent de la charte
 * (`@/lib/colors`) : aucune couleur en dur ici (règle d'or n°2). Les points qui
 * représentent un lieu unique sont des repères GPS (`pin`) ; l'arrêt numéroté
 * d'une séquence reste une pastille ronde (le numéro y est plus lisible).
 */
export const MARKER_TONES: Record<MarkerTone, MarkerStyle> = {
  depot: { color: brand[800], shape: "pin", size: 34, icon: "warehouse" },
  stop: { color: brand[500], shape: "round" },
  pickup: { color: status.transit.strong, shape: "pin" },
  delivery: { color: status.delivered.strong, shape: "pin" },
  default: { color: brand[500], shape: "pin" },
}

const DEFAULT_STYLE: Required<MarkerStyle> = {
  color: brand[500],
  textColor: neutral.white,
  borderColor: neutral.white,
  size: 28,
  shape: "pin",
  icon: null,
}

/** Fusionne le préréglage d'un rôle avec d'éventuelles surcharges fines. */
export function resolveMarkerStyle(
  tone: MarkerTone = "default",
  overrides?: MarkerStyle,
): Required<MarkerStyle> {
  return { ...DEFAULT_STYLE, ...MARKER_TONES[tone], ...overrides }
}

/**
 * Point d'ancrage Mapbox selon la forme : un `pin` est ancré par sa pointe
 * (bas), une pastille par son centre. (Type littéral pour éviter d'importer
 * `mapbox-gl` ici et garder ce module hors du chunk Mapbox.)
 */
export function markerAnchor(shape: MarkerShape = "pin"): "bottom" | "center" {
  return shape === "pin" ? "bottom" : "center"
}

/** Échappe le texte injecté dans le SVG (numéros d'arrêt, surtout). */
function escapeText(value: string | number): string {
  return String(value).replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c,
  )
}

/** Tracé d'un entrepôt (toit + corps + porte) en repère 24x24, centré ~(12,12.25). */
function warehousePaths(fill: string, door: string): string {
  return (
    `<path d="M4 11 L12 4.5 L20 11 V20 H4 Z" fill="${fill}"/>` +
    `<rect x="10" y="13.5" width="4" height="6.5" fill="${door}"/>`
  )
}

/**
 * Construit l'élément HTML d'un marqueur de point GPS. `pin` = repère en goutte
 * d'eau (forme GPS standard), `round`/`square` = pastille. Numéroté si `label`
 * est fourni. Style entièrement paramétrable (couleur, taille, forme, bordure).
 */
export function createMarkerElement(
  style: Required<MarkerStyle>,
  label?: string | number | null,
  title?: string,
): HTMLElement {
  const el = document.createElement("div")
  const hasLabel = label != null && label !== ""

  if (style.shape === "pin") {
    // viewBox 24x26 (goutte plus ramassée, moins haute). Ancrage "bottom" : le
    // bas-centre de la boîte (pixel (w/2, h)) tombe pile sur la coordonnée GPS.
    // La pointe du tracé est posée à y=25.25 pour que le BAS du contour
    // (épaisseur 1.5 -> +0.75) atteigne exactement y=26, donc la pointe VISIBLE
    // coïncide avec le point.
    const w = style.size
    const h = Math.round(style.size * (26 / 24))
    const inner = hasLabel
      ? `<text x="12" y="11.5" text-anchor="middle" dominant-baseline="central" fill="${style.textColor}" font-size="11" font-weight="700" font-family="system-ui, sans-serif">${escapeText(label)}</text>`
      : style.icon === "warehouse"
        ? // Entrepôt logé dans le renflement de la goutte (recentré sur (12, 11.5)).
          `<g transform="translate(12 11.5) scale(0.62) translate(-12 -12.25)">${warehousePaths(style.textColor, style.color)}</g>`
        : `<circle cx="12" cy="11.5" r="4" fill="${style.textColor}"/>`
    el.style.cssText = [
      `width:${w}px`,
      `height:${h}px`,
      "filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))",
      "cursor:inherit",
    ].join(";")
    el.innerHTML =
      `<svg width="${w}" height="${h}" viewBox="0 0 24 26" style="overflow:visible;display:block" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M12 25.25C12 25.25 22.5 17.5 22.5 11.5 22.5 5.7 17.8 1 12 1 6.2 1 1.5 5.7 1.5 11.5 1.5 17.5 12 25.25 12 25.25Z" fill="${style.color}" stroke="${style.borderColor}" stroke-width="1.5"/>` +
      inner +
      `</svg>`
    if (title) el.title = title
    return el
  }

  el.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    `width:${style.size}px`,
    `height:${style.size}px`,
    `background:${style.color}`,
    `color:${style.textColor}`,
    `font-size:${Math.round(style.size * 0.46)}px`,
    "font-weight:700",
    `border:2px solid ${style.borderColor}`,
    "box-shadow:0 1px 3px rgba(0,0,0,.35)",
    `border-radius:${style.shape === "square" ? "4px" : "9999px"}`,
  ].join(";")
  if (hasLabel) el.textContent = String(label)
  if (title) el.title = title
  return el
}
