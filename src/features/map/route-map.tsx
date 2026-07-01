import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import "mapbox-gl/dist/mapbox-gl.css"
import "./mapbox-overrides.css"
import { Loader2, Map as MapIcon, Route as RouteIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { brand, neutral } from "@/lib/colors"
import { decodePolyline } from "@/lib/polyline"
import { formatDistance, formatDuration } from "@/lib/units"
import { isMapConfigured, mapboxgl } from "./setup"
import { useMap } from "./use-map"
import { createMarkerElement, markerAnchor, resolveMarkerStyle } from "./markers"
import type { MapPoint } from "./types"

const ROUTE_SOURCE = "route"
const ROUTE_LAYER = "route-line"

function escapeHtml(value: string): string {
  return value.replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c] ?? c,
  )
}

/** Contenu de la popup d'un marqueur : titre (nom) + détail (adresse). */
function popupHtml(title?: string, description?: string): string {
  const head = title
    ? `<div style="font-weight:600;color:${neutral[900]}">${escapeHtml(title)}</div>`
    : ""
  const body = description
    ? `<div style="margin-top:2px;color:${neutral[700]}">${escapeHtml(description)}</div>`
    : ""
  return `<div style="font-size:12px;line-height:1.35;max-width:220px">${head}${body}</div>`
}

interface RouteMapProps {
  /** Polyline encodée (précision 5, ordre [lat, lon]). */
  polyline?: string | null
  /** Points GPS à marquer (dépôt, arrêts, enlèvement/livraison...). */
  markers?: MapPoint[]
  distanceMeters?: number | null
  durationSeconds?: number | null
  /** Carte indisponible (ex. brique itinéraire 503) -> mode dégradé. */
  unavailable?: boolean
  loading?: boolean
  className?: string
}

/**
 * Carte d'itinéraire Mapbox GL. Décode `polyline` (paires [lat, lon]), trace la
 * route d'un seul trait et place les `markers` (style centralisé via la feature
 * map). Mode dégradé quand la carte est indisponible.
 */
export function RouteMap({
  polyline,
  markers = [],
  distanceMeters,
  durationSeconds,
  unavailable: unavailableProp,
  loading,
  className,
}: RouteMapProps) {
  const { t } = useTranslation()
  // Jeton Mapbox absent -> mode dégradé (cf. `isMapConfigured`).
  const unavailable = unavailableProp || !isMapConfigured
  const { containerRef, mapRef, ready } = useMap({ enabled: !unavailable })
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const path = decodePolyline(polyline)
  // GeoJSON attend des coordonnées [lon, lat] (l'inverse de la polyline).
  const lineCoords: [number, number][] = path.map(([lat, lon]) => [lon, lat])
  const pointCoords: [number, number][] = markers.map((m) => [
    m.longitude,
    m.latitude,
  ])
  const allCoords = [...lineCoords, ...pointCoords]
  const hasGeometry = allCoords.length > 0
  const hasMetrics = distanceMeters != null || durationSeconds != null

  // Clés de dépendance stables (évite de retracer à chaque rendu).
  const lineKey = lineCoords.map((c) => c.join(",")).join(";")
  const markerKey = markers
    .map(
      (m) =>
        `${m.longitude},${m.latitude},${m.tone},${m.index},${m.title},${m.description},${JSON.stringify(m.style)}`,
    )
    .join(";")

  // Mise à jour du tracé, des marqueurs et du cadrage.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

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

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = markers.map((point) => {
      const style = resolveMarkerStyle(point.tone, point.style)
      const element = createMarkerElement(style, point.index, point.title)
      const marker = new mapboxgl.Marker({
        element,
        anchor: markerAnchor(style.shape),
      })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map)
      if (point.title || point.description) {
        const popup = new mapboxgl.Popup({
          offset: style.shape === "pin" ? 28 : 16,
          closeButton: false,
        }).setHTML(popupHtml(point.title, point.description))
        marker.setPopup(popup)
        element.style.cursor = "pointer"
      }
      return marker
    })

    if (allCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()
      allCoords.forEach((c) => bounds.extend(c))
      map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lineKey, markerKey])

  return (
    <div className={cn("relative overflow-hidden rounded-lg border", className)}>
      {unavailable ? (
        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 bg-neutral-50 p-6 text-center">
          <MapIcon className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("map.unavailable")}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="h-full min-h-48 w-full" />
      )}

      {!unavailable && !hasGeometry && ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("map.empty")}</p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
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
