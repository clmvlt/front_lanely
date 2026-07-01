import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import "mapbox-gl/dist/mapbox-gl.css"
import "./mapbox-overrides.css"
import { Loader2, Map as MapIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { neutral } from "@/lib/colors"
import { isMapConfigured, mapboxgl } from "./setup"
import { useMap } from "./use-map"
import { createMarkerElement, markerAnchor, resolveMarkerStyle } from "./markers"
import type { MapPoint } from "./types"

const LINK_SOURCE = "points-links"
const LINK_LAYER = "points-links-line"

/** Un marqueur de la carte multi-points, identifié pour la sélection/survol. */
export interface MapMarker extends MapPoint {
  /** Identifiant unique du marqueur. */
  id: string
  /**
   * Groupe de sélection (ex. l'id de la lettre de voiture, partagé par ses
   * points chargement + livraison). Survoler/cliquer agit sur tout le groupe.
   * Défaut : `id`.
   */
  groupId?: string
  /**
   * Repère purement indicatif (ex. le dépôt) : ni survol ni clic, et pas
   * d'agrandissement au survol. Défaut : `true` (interactif).
   */
  interactive?: boolean
}

/** Trait reliant deux points (ex. chargement → livraison d'une même lettre). */
export interface MapLink {
  id: string
  /** Origine [longitude, latitude]. */
  from: [number, number]
  /** Destination [longitude, latitude]. */
  to: [number, number]
}

interface PointsMapProps {
  markers: MapMarker[]
  links?: MapLink[]
  /** Groupe mis en avant (agrandit ses marqueurs). Survol liste ↔ carte. */
  hoveredGroupId?: string | null
  onHover?: (groupId: string | null) => void
  onSelect?: (groupId: string) => void
  loading?: boolean
  unavailable?: boolean
  emptyLabel?: string
  className?: string
}

interface TrackedMarker {
  marker: mapboxgl.Marker
  inner: HTMLElement
  groupId: string
  interactive: boolean
}

/**
 * Carte Mapbox affichant un ENSEMBLE de points GPS interactifs (un par entité),
 * avec survol et sélection synchronisés vers une liste. Complète `RouteMap`
 * (itinéraire unique) pour les vues « beaucoup de points sur une carte ». Les
 * `links` tracent un trait entre deux points d'un même groupe.
 */
export function PointsMap({
  markers,
  links = [],
  hoveredGroupId,
  onHover,
  onSelect,
  loading,
  unavailable: unavailableProp,
  emptyLabel,
  className,
}: PointsMapProps) {
  const { t } = useTranslation()
  // Jeton Mapbox absent -> mode dégradé (cf. `isMapConfigured`).
  const unavailable = unavailableProp || !isMapConfigured
  const { containerRef, mapRef, ready } = useMap({ enabled: !unavailable })
  const trackedRef = useRef<TrackedMarker[]>([])

  const onHoverRef = useRef(onHover)
  onHoverRef.current = onHover
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const markerKey = markers
    .map(
      (m) =>
        `${m.id}:${m.longitude},${m.latitude}:${m.tone}:${m.index}:${JSON.stringify(m.style)}`,
    )
    .join(";")
  const linkKey = links
    .map((l) => `${l.id}:${l.from.join(",")}>${l.to.join(",")}`)
    .join(";")
  const hasGeometry = markers.length > 0

  // (Re)construction des marqueurs + traits + cadrage. Indépendant du survol.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    // Traits chargement → livraison.
    const linkData = {
      type: "FeatureCollection" as const,
      features: links.map((l) => ({
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: [l.from, l.to],
        },
      })),
    }
    const existingLinks = map.getSource(LINK_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined
    if (existingLinks) {
      existingLinks.setData(linkData)
    } else {
      map.addSource(LINK_SOURCE, { type: "geojson", data: linkData })
      map.addLayer({
        id: LINK_LAYER,
        type: "line",
        source: LINK_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": neutral[400],
          "line-width": 1.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.8,
        },
      })
    }

    trackedRef.current.forEach((tm) => tm.marker.remove())
    trackedRef.current = markers.map((point) => {
      const groupId = point.groupId ?? point.id
      const style = resolveMarkerStyle(point.tone, point.style)
      const inner = createMarkerElement(style, point.index, point.title)
      inner.style.transition = "transform .15s ease"
      inner.style.transformOrigin =
        markerAnchor(style.shape) === "bottom" ? "bottom center" : "center"

      const interactive = point.interactive !== false
      const wrapper = document.createElement("div")
      wrapper.style.cursor = interactive ? "pointer" : "default"
      wrapper.appendChild(inner)
      if (interactive) {
        wrapper.addEventListener("mouseenter", () =>
          onHoverRef.current?.(groupId),
        )
        wrapper.addEventListener("mouseleave", () => onHoverRef.current?.(null))
        wrapper.addEventListener("click", (event) => {
          event.stopPropagation()
          onSelectRef.current?.(groupId)
        })
      }

      const marker = new mapboxgl.Marker({
        element: wrapper,
        anchor: markerAnchor(style.shape),
      })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map)
      return { marker, inner, groupId, interactive }
    })

    const coords: [number, number][] = [
      ...markers.map((m) => [m.longitude, m.latitude] as [number, number]),
      ...links.flatMap((l) => [l.from, l.to]),
    ]
    if (coords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      coords.forEach((c) => bounds.extend(c))
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, markerKey, linkKey])

  // Mise en avant du groupe survolé (sans retracer les marqueurs).
  useEffect(() => {
    trackedRef.current.forEach((tm) => {
      const active =
        tm.interactive &&
        hoveredGroupId != null &&
        tm.groupId === hoveredGroupId
      tm.inner.style.transform = active ? "scale(1.3)" : ""
      tm.marker.getElement().style.zIndex = active ? "1" : ""
    })
  }, [hoveredGroupId, markerKey])

  return (
    <div className={cn("relative overflow-hidden rounded-lg border", className)}>
      {unavailable ? (
        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 bg-neutral-50 p-6 text-center">
          <MapIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("map.unavailable")}</p>
        </div>
      ) : (
        <div ref={containerRef} className="h-full min-h-48 w-full" />
      )}

      {!unavailable && !hasGeometry && ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {emptyLabel ?? t("map.empty")}
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
