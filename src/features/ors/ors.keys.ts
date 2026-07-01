import type { GeocodingSearchParams } from "./types"

export const orsKeys = {
  all: ["ors"] as const,

  geocodingStatus: () => [...orsKeys.all, "geocoding", "status"] as const,
  search: (params: GeocodingSearchParams) =>
    [...orsKeys.all, "geocoding", "search", params] as const,

  routingStatus: () => [...orsKeys.all, "routing", "status"] as const,
}
