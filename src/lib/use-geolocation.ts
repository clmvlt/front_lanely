import { useEffect, useState } from "react"

export interface GeolocationCoords {
  latitude: number
  longitude: number
  /** Précision estimée en mètres (rayon du cercle de confiance). */
  accuracy: number
}

interface UseGeolocationOptions {
  /** N'interroge le navigateur que lorsque `true` (défaut). */
  enabled?: boolean
  /**
   * Précision minimale acceptée, en mètres. Au-dessus, la position est jugée
   * trop approximative (géoloc. par IP/réseau, souvent fausse) et ignorée :
   * aucune position n'est alors retournée. Défaut 5000 m.
   */
  maxAccuracyMeters?: number
}

/**
 * Position du navigateur, demandée une fois. Renvoie `null` tant qu'elle n'est
 * pas obtenue, ou si elle est refusée / indisponible / trop imprécise (dans ces
 * cas on n'envoie aucune position). Ne redemande pas en boucle.
 */
export function useGeolocation({
  enabled = true,
  maxAccuracyMeters = 5000,
}: UseGeolocationOptions = {}): GeolocationCoords | null {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === "undefined" || !navigator.geolocation) return

    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return
        const { latitude, longitude, accuracy } = position.coords
        // Position trop imprécise (souvent une estimation par IP) : on l'ignore
        // plutôt que de biaiser la recherche vers un mauvais endroit.
        if (typeof accuracy === "number" && accuracy > maxAccuracyMeters) return
        setCoords({ latitude, longitude, accuracy })
      },
      () => {
        /* Refusée ou indisponible : on reste sans position. */
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )

    return () => {
      cancelled = true
    }
  }, [enabled, maxAccuracyMeters])

  return coords
}
