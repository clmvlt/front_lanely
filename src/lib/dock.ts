/**
 * Calcul du « stock dormant » : durée de séjour à quai d'une lettre de voiture
 * ou d'une ligne de marchandise. L'API ne renvoie pas la durée (cf. doc) ; elle
 * se déduit côté client de `dockEnteredAt` / `dockExitedAt` et du statut.
 */

/** Seuil d'alerte (jours) au-delà duquel un séjour à quai est signalé. */
export const DOCK_DWELL_ALERT_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export interface DockDwell {
  /** Durée du séjour en millisecondes. */
  ms: number
  /** Séjour encore en cours (statut `AT_DOCK`). */
  ongoing: boolean
}

/**
 * Durée de séjour à quai. Si `AT_DOCK` : maintenant - `dockEnteredAt` (en
 * cours). Sinon : dernier séjour connu = `dockExitedAt` - `dockEnteredAt`.
 * Renvoie `null` si non calculable (jamais passé à quai, ou sortie manquante
 * alors que le statut n'est plus `AT_DOCK`).
 */
export function dockDwell(
  status: string,
  dockEnteredAt?: string | null,
  dockExitedAt?: string | null,
  now: Date = new Date(),
): DockDwell | null {
  if (!dockEnteredAt) return null
  const enter = new Date(dockEnteredAt).getTime()
  if (Number.isNaN(enter)) return null
  if (status === "AT_DOCK") {
    return { ms: Math.max(0, now.getTime() - enter), ongoing: true }
  }
  if (!dockExitedAt) return null
  const exit = new Date(dockExitedAt).getTime()
  if (Number.isNaN(exit)) return null
  return { ms: Math.max(0, exit - enter), ongoing: false }
}

/** True si un séjour en cours dépasse le seuil d'alerte (stock dormant). */
export function isDockDwellOverdue(dwell: DockDwell): boolean {
  return dwell.ongoing && dwell.ms > DOCK_DWELL_ALERT_DAYS * DAY_MS
}
