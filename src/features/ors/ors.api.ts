import { http, type RequestOptions } from "@/lib/http"
import { config } from "@/lib/config"
import type {
  AddressResult,
  GeocodingSearchParams,
  GeocodingStatus,
  MatrixRequest,
  MatrixResponse,
  OptimizeRequest,
  OptimizeResponse,
  RouteRequest,
  RouteResponse,
  RoutingStatus,
} from "./types"

/**
 * Couche HTTP de l'API ORS. On reutilise le client central (`http`) avec deux
 * particularites communes a tous les appels :
 * - `baseUrl` pointe sur l'hote ORS (pas l'API Spring Boot) ;
 * - `auth: false` : API ouverte, aucun Bearer (et donc pas de refresh 401).
 */
const ORS: RequestOptions = { baseUrl: config.orsBaseUrl, auth: false }

export const orsApi = {
  /* ----------------------------- Geocoding ---------------------------- */

  geocodingStatus: () =>
    http.get<GeocodingStatus>("/geocoding/status", ORS),

  /** Recherche / autocompletion d'adresse (resultats tries par score). */
  searchAddress: ({ q, limit, lat, lon }: GeocodingSearchParams) =>
    http.get<AddressResult[]>("/geocoding/search", {
      ...ORS,
      query: { q, limit, lat, lon },
    }),

  /* ------------------------------ Routing ----------------------------- */

  routingStatus: () => http.get<RoutingStatus>("/routing/status", ORS),

  /** Itineraire point a point (`from`+`to`) ou multi-points ordonne (`points`). */
  route: (body: RouteRequest) =>
    http.post<RouteResponse>("/routing/route", body, ORS),

  /** Matrice NxN des temps de trajet entre tous les points. */
  matrix: (body: MatrixRequest) =>
    http.post<MatrixResponse>("/routing/matrix", body, ORS),

  /* ---------------------------- Optimisation -------------------------- */

  /** Optimise l'ordre de passage (VRP/TSP) depuis/vers un depot commun. */
  optimize: (body: OptimizeRequest) =>
    http.post<OptimizeResponse>("/optimization/optimize", body, ORS),
}
