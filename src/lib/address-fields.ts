import type { AddressDto, CoordinateDto } from "@/lib/transport-types"

/**
 * Suggestion d'adresse normalisée consommée par l'UI (autocomplete + champs
 * adresse). Forme stable côté app : le `AddressAutocomplete` la produit à partir
 * des résultats de géocodage ORS (`AddressResult`, en `lat`/`lon`) mappés ici en
 * `latitude`/`longitude`.
 */
export interface AddressSuggestionResponse {
  /** Libellé prêt à afficher, ex. "12 Rue du Bocage, 35000 Rennes". */
  label: string
  houseNumber?: string | null
  street?: string | null
  postcode?: string | null
  city?: string | null
  latitude: number
  longitude: number
  type: "street" | "housenumber"
  /** Présent uniquement si une position de référence a été fournie. */
  distanceMeters?: number | null
  score: number
}

/**
 * État local d'un bloc adresse (autocomplete + champs éditables + coordonnées).
 * `search` est le texte de la zone d'autocomplétion ; les coordonnées sont
 * remplies en choisissant une suggestion (cf. `AddressAutocomplete`).
 */
export interface AddressFieldsValue {
  search: string
  line1: string
  line2: string
  postalCode: string
  city: string
  state: string
  country: string
  latitude: number | null
  longitude: number | null
}

export function emptyAddressFields(): AddressFieldsValue {
  return {
    search: "",
    line1: "",
    line2: "",
    postalCode: "",
    city: "",
    state: "",
    country: "",
    latitude: null,
    longitude: null,
  }
}

export function addressFieldsFromDto(
  address?: AddressDto | null,
  location?: CoordinateDto | null,
): AddressFieldsValue {
  return {
    search: "",
    line1: address?.line1 ?? "",
    line2: address?.line2 ?? "",
    postalCode: address?.postalCode ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    country: address?.country ?? "",
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
  }
}

function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** Renvoie l'adresse (null si entièrement vide) et la coordonnée (null si incomplète). */
export function addressFieldsToDto(value: AddressFieldsValue): {
  address: AddressDto | null
  location: CoordinateDto | null
} {
  const address: AddressDto = {
    line1: nz(value.line1),
    line2: nz(value.line2),
    postalCode: nz(value.postalCode),
    city: nz(value.city),
    state: nz(value.state),
    country: nz(value.country),
  }
  const hasAddress = Object.values(address).some((v) => v !== null)
  const location =
    typeof value.latitude === "number" && typeof value.longitude === "number"
      ? { latitude: value.latitude, longitude: value.longitude }
      : null
  return { address: hasAddress ? address : null, location }
}
