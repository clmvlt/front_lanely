import { useMutation, useQuery } from "@tanstack/react-query"
import { orsApi } from "./ors.api"
import { orsKeys } from "./ors.keys"
import type {
  GeocodingSearchParams,
  MatrixRequest,
  OptimizeRequest,
  RouteRequest,
} from "./types"

/* ------------------------------ Statuts ------------------------------- */
// A interroger avant un appel : si `ready` est faux, la brique renvoie 503.

export function useGeocodingStatus() {
  return useQuery({
    queryKey: orsKeys.geocodingStatus(),
    queryFn: orsApi.geocodingStatus,
    staleTime: 60_000,
  })
}

export function useRoutingStatus() {
  return useQuery({
    queryKey: orsKeys.routingStatus(),
    queryFn: orsApi.routingStatus,
    staleTime: 60_000,
  })
}

/* ----------------------------- Geocoding ------------------------------ */

/**
 * Recherche / autocompletion d'adresse. `enabled` tant que `q` n'est pas vide ;
 * penser a debouncer `params.q` cote appelant pour limiter les requetes.
 */
export function useAddressSearch(
  params: GeocodingSearchParams,
  options?: { enabled?: boolean },
) {
  const q = params.q.trim()
  return useQuery({
    queryKey: orsKeys.search({ ...params, q }),
    queryFn: () => orsApi.searchAddress({ ...params, q }),
    enabled: (options?.enabled ?? true) && q.length > 0,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  })
}

/* ----------------- Routing / Optimisation (mutations) ----------------- */
// Operations de calcul (POST) : exposees en mutations pour declenchement
// explicite plutot qu'a chaque rendu.

export function useRoute() {
  return useMutation({
    mutationFn: (body: RouteRequest) => orsApi.route(body),
  })
}

export function useMatrix() {
  return useMutation({
    mutationFn: (body: MatrixRequest) => orsApi.matrix(body),
  })
}

export function useOptimizeTour() {
  return useMutation({
    mutationFn: (body: OptimizeRequest) => orsApi.optimize(body),
  })
}
