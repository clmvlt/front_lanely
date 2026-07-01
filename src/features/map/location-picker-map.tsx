import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import "mapbox-gl/dist/mapbox-gl.css"
import "./mapbox-overrides.css"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { mapboxgl } from "./setup"
import { useMap } from "./use-map"
import { createMarkerElement, markerAnchor, resolveMarkerStyle } from "./markers"
import type { MarkerStyle, MarkerTone } from "./markers"
import { MapSearchOverlay } from "./map-search-overlay"
import type { MapSearchConfig } from "./map-search-overlay"

export interface PickedCoordinate {
  latitude: number
  longitude: number
}

interface LocationPickerMapProps {
  /** Coordonnée courante du marqueur (ou `null` si non placé). */
  latitude: number | null
  longitude: number | null
  /** Remonte la coordonnée choisie (clic carte ou déplacement du marqueur). */
  onChange: (coord: PickedCoordinate) => void
  /** Lecture seule : pas de clic ni de déplacement. */
  disabled?: boolean
  className?: string
  /** Rôle du repère (couleur/forme). Défaut "depot". */
  tone?: MarkerTone
  /** Surcharges fines du style du repère. */
  markerStyle?: MarkerStyle
  /** Aide affichée sous la carte (mode éditable). Défaut générique. */
  hint?: string
  /** Texte affiché tant qu'aucun point n'est placé. Défaut générique. */
  emptyHint?: string
  /**
   * Recherche d'adresse superposée à la carte. Omettre = pas de recherche.
   * Le point courant sert automatiquement de biais de proximité.
   */
  search?: MapSearchConfig
}

/**
 * Carte Mapbox GL de sélection d'un point unique. Le marqueur est déplaçable et
 * un clic sur la carte le repositionne ; chaque déplacement remonte la
 * coordonnée au parent. Les coordonnées sont donc saisies MANUELLEMENT (l'API
 * ne géocode jamais), une recherche d'adresse ne servant qu'à pré-placer un
 * point que l'on ajuste ensuite ici.
 */
export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  disabled,
  className,
  tone = "depot",
  markerStyle,
  hint,
  emptyHint,
  search,
}: LocationPickerMapProps) {
  const { t } = useTranslation()
  const hasCoord = typeof latitude === "number" && typeof longitude === "number"

  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // Mémorise qu'un changement provient d'une interaction carte (clic/glisser) :
  // dans ce cas, on ne recadre PAS (la vue est déjà bonne et un recadrage
  // donnerait l'impression que le repère se déplace). On ne recadre que pour un
  // point posé de l'extérieur (recherche d'adresse, saisie manuelle lat/lon).
  const fromMapRef = useRef(false)

  const { containerRef, mapRef, ready } = useMap({
    center: hasCoord ? [longitude as number, latitude as number] : undefined,
    zoom: hasCoord ? 14 : undefined,
    onClick: disabled
      ? undefined
      : (coord) => {
          fromMapRef.current = true
          onChangeRef.current(coord)
        },
  })

  // Synchronise le marqueur avec la coordonnée et recadre la carte si besoin.
  // On attend que la carte soit chargée (`ready`), sinon le marqueur posé avant
  // le `load` peut ne pas s'afficher au premier rendu.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (!hasCoord) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    const lngLat: [number, number] = [longitude as number, latitude as number]
    if (!markerRef.current) {
      const style = resolveMarkerStyle(tone, markerStyle)
      const element = createMarkerElement(style)
      const marker = new mapboxgl.Marker({
        element,
        anchor: markerAnchor(style.shape),
        draggable: !disabled,
      })
        .setLngLat(lngLat)
        .addTo(map)
      marker.on("dragend", () => {
        const pos = marker.getLngLat()
        fromMapRef.current = true
        onChangeRef.current({ latitude: pos.lat, longitude: pos.lng })
      })
      markerRef.current = marker
    } else {
      markerRef.current.setLngLat(lngLat)
      markerRef.current.setDraggable(!disabled)
    }

    if (fromMapRef.current) {
      fromMapRef.current = false
    } else {
      map.easeTo({ center: lngLat, duration: 400 })
    }
  }, [latitude, longitude, hasCoord, disabled, tone, markerStyle, ready, mapRef])

  return (
    <div className={cn("relative overflow-hidden rounded-lg border", className)}>
      <div ref={containerRef} className="h-full min-h-56 w-full" />

      {search && !disabled && (
        <MapSearchOverlay {...search} disabled={disabled} />
      )}

      {!hasCoord && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 p-6 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {emptyHint ?? t("map.pickerEmpty")}
          </p>
        </div>
      )}

      {!disabled && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-md bg-card/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          {hint ?? t("map.pickerHint")}
        </div>
      )}
    </div>
  )
}
