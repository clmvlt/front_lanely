import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import "mapbox-gl/dist/mapbox-gl.css"
import "./mapbox-overrides.css"
import { Loader2, Map as MapIcon, MousePointerClick, Route as RouteIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { brand } from "@/lib/colors"
import { decodePolyline } from "@/lib/polyline"
import { formatDistance, formatDuration } from "@/lib/units"
import { mapboxgl } from "./setup"
import { useMap } from "./use-map"
import { createMarkerElement, markerAnchor, resolveMarkerStyle } from "./markers"
import { MapSearchOverlay } from "./map-search-overlay"
import type { MapSearchConfig } from "./map-search-overlay"
import type { PickedCoordinate } from "./location-picker-map"

const ROUTE_SOURCE = "planner-route"
const ROUTE_LAYER = "planner-route-line"

/** Point localisé du planificateur (déjà géocodé). */
export interface RoutePlannerPoint {
  id: string
  latitude: number
  longitude: number
  /** Numéro affiché sur le repère (1-based). Défaut : position dans la liste. */
  index?: number
  /** Titre de la popup (nom du point). */
  title?: string
}

export interface RoutePlannerMapProps {
  /** Points localisés, dans l'ordre de passage. */
  points: RoutePlannerPoint[]
  /** Dépôt (départ/arrivée). Repère non interactif. */
  depot?: { latitude: number; longitude: number; title?: string } | null
  /** Tracé de l'itinéraire (polyline encodée [lat, lon]). */
  polyline?: string | null
  distanceMeters?: number | null
  durationSeconds?: number | null
  /** Clic sur la carte -> ajoute un point. Omettre = pas d'ajout au clic. */
  onAddPoint?: (coord: PickedCoordinate) => void
  /** Glisser un repère -> déplace le point. Omettre = repères fixes. */
  onMovePoint?: (id: string, coord: PickedCoordinate) => void
  /** Clic sur un repère. */
  onSelectPoint?: (id: string) => void
  /** Clic droit sur un repère -> supprime le point. */
  onDeletePoint?: (id: string) => void
  /** Recherche d'adresse superposée. */
  search?: MapSearchConfig
  loading?: boolean
  /** Carte indisponible (ex. brique itinéraire 503) -> mode dégradé. */
  unavailable?: boolean
  /** Indice affiché en bas (ex. « cliquez pour ajouter »). */
  hint?: string
  className?: string
}

interface TrackedMarker {
  marker: mapboxgl.Marker
}

/**
 * Carte Mapbox de PLANIFICATION d'un itinéraire/tournée : on construit la liste
 * des points en cliquant sur la carte (`onAddPoint`), en glissant les repères
 * (`onMovePoint`) ou via la recherche d'adresse superposée. Le tracé `polyline`
 * et les métriques sont affichés comme dans `RouteMap`. Réutilisée par le devis
 * et par les tournées (où les repères sont fixes : pas de `onMovePoint`).
 */
export function RoutePlannerMap({
  points,
  depot,
  polyline,
  distanceMeters,
  durationSeconds,
  onAddPoint,
  onMovePoint,
  onSelectPoint,
  onDeletePoint,
  search,
  loading,
  unavailable,
  hint,
  className,
}: RoutePlannerMapProps) {
  const { t } = useTranslation()
  const trackedRef = useRef<TrackedMarker[]>([])
  // Un changement issu d'une interaction carte (clic/glisser) ne doit pas
  // déclencher de recadrage (la vue est déjà bonne). Cf. location-picker-map.
  const fromMapRef = useRef(false)

  const onAddRef = useRef(onAddPoint)
  onAddRef.current = onAddPoint
  const onMoveRef = useRef(onMovePoint)
  onMoveRef.current = onMovePoint
  const onSelectRef = useRef(onSelectPoint)
  onSelectRef.current = onSelectPoint
  const onDeleteRef = useRef(onDeletePoint)
  onDeleteRef.current = onDeletePoint

  const { containerRef, mapRef, ready } = useMap({
    enabled: !unavailable,
    onClick: onAddPoint
      ? (coord) => {
          fromMapRef.current = true
          onAddRef.current?.(coord)
        }
      : undefined,
  })

  const path = decodePolyline(polyline)
  const lineCoords: [number, number][] = path.map(([lat, lon]) => [lon, lat])
  const allCoords: [number, number][] = [
    ...lineCoords,
    ...points.map((p) => [p.longitude, p.latitude] as [number, number]),
    ...(depot ? [[depot.longitude, depot.latitude] as [number, number]] : []),
  ]
  const hasGeometry = allCoords.length > 0
  const hasMetrics = distanceMeters != null || durationSeconds != null
  const draggable = Boolean(onMovePoint)

  const lineKey = lineCoords.map((c) => c.join(",")).join(";")
  const markerKey = points
    .map((p, i) => `${p.id}:${p.longitude},${p.latitude}:${p.index ?? i + 1}:${p.title}`)
    .join(";")
  const depotKey = depot ? `${depot.longitude},${depot.latitude}:${depot.title}` : ""

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    // Tracé de l'itinéraire.
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: lineCoords },
    }
    const existing = map.getSource(ROUTE_SOURCE) as
      | mapboxgl.GeoJSONSource
      | undefined
    if (existing) {
      existing.setData(data)
    } else {
      map.addSource(ROUTE_SOURCE, { type: "geojson", data })
      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": brand[500], "line-width": 4 },
      })
    }

    // Repères : dépôt (fixe) + points numérotés.
    trackedRef.current.forEach((tm) => tm.marker.remove())
    trackedRef.current = []

    if (depot) {
      const style = resolveMarkerStyle("depot")
      const element = createMarkerElement(style, undefined, depot.title)
      const marker = new mapboxgl.Marker({
        element,
        anchor: markerAnchor(style.shape),
      })
        .setLngLat([depot.longitude, depot.latitude])
        .addTo(map)
      trackedRef.current.push({ marker })
    }

    points.forEach((point, i) => {
      const style = resolveMarkerStyle("stop")
      const element = createMarkerElement(style, point.index ?? i + 1, point.title)
      if (onSelectRef.current || draggable) element.style.cursor = "pointer"
      if (onSelectRef.current) {
        element.addEventListener("click", (event) => {
          event.stopPropagation()
          onSelectRef.current?.(point.id)
        })
      }
      if (onDeleteRef.current) {
        element.addEventListener("contextmenu", (event) => {
          event.preventDefault()
          event.stopPropagation()
          onDeleteRef.current?.(point.id)
        })
      }
      const marker = new mapboxgl.Marker({
        element,
        anchor: markerAnchor(style.shape),
        draggable,
      })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map)
      if (draggable) {
        marker.on("dragend", () => {
          const pos = marker.getLngLat()
          fromMapRef.current = true
          onMoveRef.current?.(point.id, {
            latitude: pos.lat,
            longitude: pos.lng,
          })
        })
      }
      trackedRef.current.push({ marker })
    })

    if (fromMapRef.current) {
      fromMapRef.current = false
    } else if (allCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      allCoords.forEach((c) => bounds.extend(c))
      map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 400 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lineKey, markerKey, depotKey, draggable])

  return (
    <div className={cn("relative overflow-hidden rounded-lg border", className)}>
      {unavailable ? (
        <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 bg-neutral-50 p-6 text-center">
          <MapIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("map.unavailable")}</p>
        </div>
      ) : (
        <div ref={containerRef} className="h-full min-h-56 w-full" />
      )}

      {search && !unavailable && <MapSearchOverlay {...search} />}

      {!unavailable && !hasGeometry && ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 p-6 text-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MousePointerClick className="size-4" />
            {hint ?? t("map.plannerEmpty")}
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!unavailable && hasGeometry && (onAddPoint || hint) && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex items-center gap-1.5 rounded-md bg-card/90 px-2.5 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <MousePointerClick className="size-3.5" />
          {hint ?? t("map.plannerHint")}
        </div>
      )}

      {!unavailable && hasMetrics && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 rounded-md bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
          <span className="flex items-center gap-1.5">
            <RouteIcon className="size-3.5 text-muted-foreground" />
            {formatDistance(distanceMeters)}
          </span>
          <span className="text-muted-foreground">
            {formatDuration(durationSeconds)}
          </span>
        </div>
      )}
    </div>
  )
}
