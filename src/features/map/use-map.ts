import { useEffect, useRef, useState } from "react"
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLE,
  isMapConfigured,
  mapboxgl,
} from "./setup"

export interface UseMapOptions {
  /** Centre initial [lon, lat]. Défaut : France métropolitaine. */
  center?: [number, number]
  /** Zoom initial. */
  zoom?: number
  /** Clic sur la carte -> coordonnée (utilisé par le sélecteur de point). */
  onClick?: (coord: { latitude: number; longitude: number }) => void
  /**
   * Crée la carte uniquement quand `true` (défaut). Permet de différer/retirer
   * la carte en mode dégradé (ex. brique itinéraire indisponible).
   */
  enabled?: boolean
}

/**
 * Socle commun à toutes les cartes du produit : crée une instance Mapbox GL
 * (une seule fois), ajoute le contrôle de navigation, gère le redimensionnement
 * automatique et le clic. Les composants ajoutent ensuite leurs couches et
 * marqueurs via `mapRef`/`ready`.
 */
export function useMap(options: UseMapOptions = {}) {
  const { onClick, enabled = true } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [ready, setReady] = useState(false)
  // Dernier handler de clic, lu sans recréer la carte.
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick
  // Centre/zoom initiaux figés à la création (les MAJ passent par easeTo).
  const initialRef = useRef({
    center: options.center ?? DEFAULT_CENTER,
    zoom: options.zoom ?? DEFAULT_ZOOM,
  })

  useEffect(() => {
    // Sans jeton, `new mapboxgl.Map` lève une erreur non capturée : on ne crée
    // pas la carte (mode dégradé géré par les composants via `isMapConfigured`).
    if (!enabled || !isMapConfigured || !containerRef.current || mapRef.current)
      return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: initialRef.current.center,
      zoom: initialRef.current.zoom,
      attributionControl: false,
    })
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    )
    map.on("load", () => setReady(true))
    map.on("click", (event) => {
      onClickRef.current?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      })
    })
    mapRef.current = map

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [enabled])

  return { containerRef, mapRef, ready }
}
