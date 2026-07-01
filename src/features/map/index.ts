// Feature carte : tout l'affichage Mapbox du produit (points GPS, trajets,
// adresses) passe par ici, pour un style de marqueur et un comportement
// cohérents partout. Les vues importent les composants (chargés à la demande)
// et les helpers de style depuis ce barrel, jamais `mapbox-gl` directement.
export { RouteMap, LocationPickerMap, PointsMap, RoutePlannerMap } from "./lazy"
export type {
  RouteMapProps,
  LocationPickerMapProps,
  PointsMapProps,
  RoutePlannerMapProps,
} from "./lazy"
export type { RoutePlannerPoint } from "./route-planner-map"
export type { PickedCoordinate } from "./location-picker-map"
export type { MapSearchConfig } from "./map-search-overlay"
export type { MapMarker, MapLink } from "./points-map"
export type { MapPoint } from "./types"
export {
  MARKER_TONES,
  resolveMarkerStyle,
  createMarkerElement,
  markerAnchor,
} from "./markers"
export type { MarkerStyle, MarkerShape, MarkerTone } from "./markers"
