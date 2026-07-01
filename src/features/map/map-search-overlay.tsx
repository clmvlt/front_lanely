import { AddressAutocomplete } from "@/components/address-autocomplete"
import { useGeolocation } from "@/lib/use-geolocation"
import type { AddressSuggestionResponse } from "@/lib/address-fields"

export type { AddressSuggestionResponse }

/** Configuration de la recherche d'adresse superposée à une carte. */
export interface MapSearchConfig {
  /** Texte courant du champ de recherche. */
  query: string
  onQueryChange: (text: string) => void
  /** Suggestion choisie (adresse + lat/lon). */
  onSelect: (suggestion: AddressSuggestionResponse) => void
  placeholder?: string
  /** Intitulé accessible du champ (masqué visuellement). */
  label?: string
  /** Identifiant du champ (utile si plusieurs cartes sur une page). */
  id?: string
}

interface MapSearchOverlayProps extends MapSearchConfig {
  /** Désactive la recherche (carte en lecture seule). */
  disabled?: boolean
}

/**
 * Champ de recherche d'adresse flottant, à superposer en haut d'une carte.
 * Réutilisable sur n'importe quelle carte ; on l'affiche ou non au choix
 * (rendre ce composant, ou passer `search` à `LocationPickerMap`).
 *
 * Biais de proximité = position du navigateur (demandée à l'utilisateur). Si
 * elle est refusée ou indisponible, aucune position n'est envoyée à l'API.
 */
export function MapSearchOverlay({
  query,
  onQueryChange,
  onSelect,
  placeholder,
  label,
  id = "map-address-search",
  disabled,
}: MapSearchOverlayProps) {
  const here = useGeolocation({ enabled: !disabled })

  return (
    <div className="absolute top-3 left-3 z-10 w-[min(22rem,calc(100%-1.5rem))]">
      <AddressAutocomplete
        id={id}
        label={label ?? ""}
        hideLabel
        hideMessage
        inputClassName="bg-background shadow-md"
        query={query}
        onQueryChange={onQueryChange}
        onSelect={onSelect}
        placeholder={placeholder}
        biasLat={here?.latitude}
        biasLon={here?.longitude}
        disabled={disabled}
      />
    </div>
  )
}
