/**
 * =============================================================================
 *  Charte de couleurs - Lanely   (source de vérité unique)
 * =============================================================================
 *
 *  Fidèle à `color_chart.md`. C'est LE seul endroit à modifier pour changer,
 *  ajouter ou retirer une couleur du produit.
 *
 *  Comment utiliser :
 *    import { colors, brand, status, getStatusTokens } from "@/lib/colors"
 *    <div style={{ color: brand[500] }} />
 *    const s = getStatusTokens("delivered")   // { label, strong, badgeBg, badgeText }
 *
 *  Les valeurs sont aussi injectées en variables CSS au démarrage
 *  (cf. applyColorTokens() appelé dans main.tsx), donc utilisables ainsi :
 *    color: var(--brand-500);
 *    background: var(--status-delivered-bg);
 *
 *  Couleur de marque (logo) : #0153FD
 *
 *  ⚠️ Pour qu'une couleur soit aussi disponible en CLASSE Tailwind
 *     (ex. `bg-brand-500`), ajoute-la également dans le bloc @theme de
 *     `src/index.css` (Tailwind génère ses utilitaires au build).
 * =============================================================================
 */

/* -----------------------------------------------------------------------------
 * 1. Couleur de marque (Bleu)
 *    Primaire : blue-500 = teinte exacte du logo.
 * ---------------------------------------------------------------------------*/
export const brand = {
  50: "#E8EFFF", // Fond de zone sélectionnée, carte mise en avant
  100: "#C4D6FF", // Fond léger, surbrillance
  200: "#8FB0FF", // Bordure active, fond de badge info
  400: "#3D7AFE", // Variante claire, graphiques
  500: "#0153FD", // PRIMAIRE - boutons, liens, marque, éléments actifs (logo)
  600: "#0140C9", // Hover des boutons primaires
  800: "#002E94", // État pressé, texte bleu lisible sur fond clair
} as const

/* -----------------------------------------------------------------------------
 * 2. Neutres (Gris) - textes, fonds, bordures, surfaces.
 * ---------------------------------------------------------------------------*/
export const neutral = {
  white: "#FFFFFF", // Surfaces, cartes, fond de contenu
  50: "#F7F8FA", // Fond de page
  100: "#EDEFF3", // Fond de section, séparateurs doux
  200: "#D9DDE5", // Bordures, traits de tableau
  400: "#9AA1AE", // Texte secondaire, état désactivé
  700: "#4A5160", // Texte tertiaire, icônes
  900: "#161A22", // Texte principal
} as const

/* -----------------------------------------------------------------------------
 * 3. Statuts de livraison (sémantique)
 *    À garder identique sur tout le produit (dashboard, app chauffeur, suivi
 *    client). Chaque statut = une couleur forte (pastille/icône) + un fond clair
 *    de badge + une couleur de texte de badge.
 *
 *    ⚠️ Accessibilité (obligatoire) : ne jamais coder un statut par la couleur
 *    seule. Toujours associer la pastille à un libellé texte ou une icône.
 * ---------------------------------------------------------------------------*/
export type DeliveryStatus =
  | "pending"
  | "collected"
  | "dock"
  | "transit"
  | "delivered"
  | "failed"

export interface StatusTokens {
  /** Libellé FR affiché à l'utilisateur */
  label: string
  /** Couleur forte (pastille / icône) */
  strong: string
  /** Fond clair du badge */
  badgeBg: string
  /** Couleur du texte dans le badge */
  badgeText: string
}

export const status: Record<DeliveryStatus, StatusTokens> = {
  pending: {
    label: "En attente",
    strong: "#9AA1AE",
    badgeBg: "#EDEFF3",
    badgeText: "#4A5160",
  },
  collected: {
    label: "Pris en charge",
    strong: "#0153FD",
    badgeBg: "#E8EFFF",
    badgeText: "#002E94",
  },
  dock: {
    label: "À quai",
    strong: "#6366F1",
    badgeBg: "#EEF0FE",
    badgeText: "#3730A3",
  },
  transit: {
    label: "En cours de livraison",
    strong: "#F59E0B",
    badgeBg: "#FEF3DC",
    badgeText: "#854F0B",
  },
  delivered: {
    label: "Livré",
    strong: "#16A05C",
    badgeBg: "#E3F5EC",
    badgeText: "#0D6E3D",
  },
  failed: {
    label: "Incident / retard",
    strong: "#E23B3B",
    badgeBg: "#FCEAEA",
    badgeText: "#9B2727",
  },
}

/* -----------------------------------------------------------------------------
 * 4. Alias sémantiques - préférer ces noms dans l'UI plutôt que les teintes.
 * ---------------------------------------------------------------------------*/
export const semantic = {
  primary: brand[500],
  primaryHover: brand[600],
  primaryPressed: brand[800],
  text: neutral[900], // texte principal
  textMuted: neutral[400], // texte secondaire (libellés non essentiels)
  textTertiary: neutral[700], // texte tertiaire, icônes
  /** Texte bleu en corps de texte : utiliser brand-800 (WCAG AA en petit). */
  textBrand: brand[800],
  bg: neutral[50], // fond de page
  surface: neutral.white, // cartes / surfaces
  border: neutral[200],
} as const

/* -----------------------------------------------------------------------------
 *  Objet agrégé + helpers
 * ---------------------------------------------------------------------------*/
export const colors = { brand, neutral, status, semantic } as const

/** Récupère les tokens d'un statut de livraison. */
export function getStatusTokens(s: DeliveryStatus): StatusTokens {
  return status[s]
}

/** Liste ordonnée des statuts (utile pour filtres, légendes, selects). */
export const statusOrder: DeliveryStatus[] = [
  "pending",
  "collected",
  "dock",
  "transit",
  "delivered",
  "failed",
]

/* -----------------------------------------------------------------------------
 *  Synchronisation vers les variables CSS
 *  -> toute couleur définie ci-dessus devient `var(--…)` sans toucher au CSS.
 * ---------------------------------------------------------------------------*/

/** Construit la table des variables CSS dérivées de la charte. */
export function colorTokensToCssVars(): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [shade, value] of Object.entries(brand)) {
    vars[`--brand-${shade}`] = value
  }
  for (const [shade, value] of Object.entries(neutral)) {
    vars[`--neutral-${shade}`] = value
  }
  for (const [key, tokens] of Object.entries(status)) {
    vars[`--status-${key}`] = tokens.strong
    vars[`--status-${key}-bg`] = tokens.badgeBg
    vars[`--status-${key}-text`] = tokens.badgeText
  }
  for (const [key, value] of Object.entries(semantic)) {
    // --color-primary, --color-primary-hover, --color-text-muted, ...
    const kebab = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
    vars[`--color-${kebab}`] = value
  }

  return vars
}

/**
 * Injecte les couleurs de la charte en variables CSS sur l'élément cible
 * (par défaut <html>). À appeler une fois au démarrage de l'app.
 */
export function applyColorTokens(
  target: HTMLElement = document.documentElement,
): void {
  const vars = colorTokensToCssVars()
  for (const [name, value] of Object.entries(vars)) {
    target.style.setProperty(name, value)
  }
}

export default colors
