import { lazy, Suspense } from "react"
import type { ComponentProps } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RouteMap as RouteMapComponent } from "./route-map"
import type { LocationPickerMap as LocationPickerMapComponent } from "./location-picker-map"
import type { PointsMap as PointsMapComponent } from "./points-map"
import type { RoutePlannerMap as RoutePlannerMapComponent } from "./route-planner-map"

// Mapbox GL est volumineux : on le charge à la demande (uniquement sur les
// écrans qui affichent une carte) pour garder le bundle initial léger. Toutes
// les vues consomment ces wrappers (jamais les implémentations directement).

const RouteMapInner = lazy(() =>
  import("./route-map").then((m) => ({ default: m.RouteMap })),
)
const LocationPickerMapInner = lazy(() =>
  import("./location-picker-map").then((m) => ({
    default: m.LocationPickerMap,
  })),
)
const PointsMapInner = lazy(() =>
  import("./points-map").then((m) => ({ default: m.PointsMap })),
)
const RoutePlannerMapInner = lazy(() =>
  import("./route-planner-map").then((m) => ({ default: m.RoutePlannerMap })),
)

function MapFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-48 items-center justify-center rounded-lg border bg-neutral-50",
        className,
      )}
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )
}

export type RouteMapProps = ComponentProps<typeof RouteMapComponent>
export type LocationPickerMapProps = ComponentProps<
  typeof LocationPickerMapComponent
>
export type PointsMapProps = ComponentProps<typeof PointsMapComponent>
export type RoutePlannerMapProps = ComponentProps<
  typeof RoutePlannerMapComponent
>

export function RouteMap(props: RouteMapProps) {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <RouteMapInner {...props} />
    </Suspense>
  )
}

export function LocationPickerMap(props: LocationPickerMapProps) {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <LocationPickerMapInner {...props} />
    </Suspense>
  )
}

export function PointsMap(props: PointsMapProps) {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <PointsMapInner {...props} />
    </Suspense>
  )
}

export function RoutePlannerMap(props: RoutePlannerMapProps) {
  return (
    <Suspense fallback={<MapFallback className={props.className} />}>
      <RoutePlannerMapInner {...props} />
    </Suspense>
  )
}
