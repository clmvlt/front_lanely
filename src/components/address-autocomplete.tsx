import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, MapPin } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatDistance } from "@/lib/units"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { useAddressSearch } from "@/features/ors"
import type { AddressSuggestionResponse } from "@/lib/address-fields"

interface AddressAutocompleteProps {
  id: string
  label: string
  /** Texte courant de la zone de recherche. */
  query: string
  onQueryChange: (text: string) => void
  /** Appelé quand une suggestion est choisie (adresse + lat/lon). */
  onSelect: (suggestion: AddressSuggestionResponse) => void
  /** Biais de proximité (lat ET lon ensemble, ou aucun). */
  biasLat?: number | null
  biasLon?: number | null
  placeholder?: string
  disabled?: boolean
  hint?: string
  error?: string
  /** Masque le libellé (l'intitulé devient l'`aria-label` du champ). */
  hideLabel?: boolean
  /** Masque la ligne de message (hint/erreur) sous le champ. */
  hideMessage?: boolean
  /** Classes supplémentaires sur le champ (ex. fond/ombre pour un usage flottant). */
  inputClassName?: string
}

/**
 * Autocomplétion d'adresse branchée sur `/geocoding/search`. Choisir une
 * suggestion remonte ses coordonnées (lat/lon) au parent, qui les renvoie dans
 * le `location`/`depotLocation` correspondant. En mode dégradé (brique 503), la
 * saisie reste libre et l'adresse est géocodée au mieux côté serveur.
 */
export function AddressAutocomplete({
  id,
  label,
  query,
  onQueryChange,
  onSelect,
  biasLat,
  biasLon,
  placeholder,
  disabled,
  hint,
  error,
  hideLabel,
  hideMessage,
  inputClassName,
}: AddressAutocompleteProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(query.trim(), 300)
  const hasBias =
    typeof biasLat === "number" && typeof biasLon === "number"

  const search = useAddressSearch(
    {
      q: debounced,
      limit: 6,
      lat: hasBias ? (biasLat as number) : undefined,
      lon: hasBias ? (biasLon as number) : undefined,
    },
    { enabled: open && debounced.length >= 3 },
  )

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  // Mappe le résultat ORS (lat/lon) vers la forme partagée (latitude/longitude)
  // pour ne pas toucher les consommateurs de ce composant.
  const suggestions: AddressSuggestionResponse[] = (search.data ?? []).map(
    (r) => ({
      label: r.label,
      houseNumber: r.houseNumber,
      street: r.street,
      postcode: r.postcode,
      city: r.city,
      latitude: r.lat,
      longitude: r.lon,
      type: r.type === "housenumber" ? "housenumber" : "street",
      distanceMeters: r.distanceMeters,
      score: r.score,
    }),
  )
  const showList = open && debounced.length >= 3
  const message = error ?? hint

  return (
    <div className="grid gap-1.5">
      {!hideLabel && <Label htmlFor={id}>{label}</Label>}
      <div ref={containerRef} className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={query}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-label={hideLabel ? label : undefined}
          placeholder={placeholder}
          className={cn("pl-9", inputClassName)}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {search.isFetching && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {showList && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {search.isError ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t("transport.geocoding.unavailable")}
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {search.isFetching
                  ? t("common.loading")
                  : t("transport.geocoding.noResults")}
              </p>
            ) : (
              suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.label}-${index}`}
                  type="button"
                  onClick={() => {
                    onSelect(suggestion)
                    setOpen(false)
                  }}
                  className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{suggestion.label}</span>
                    {typeof suggestion.distanceMeters === "number" && (
                      <span className="block text-xs text-muted-foreground">
                        {formatDistance(suggestion.distanceMeters)}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {!hideMessage && (
        <p
          className={cn(
            "min-h-4 text-xs",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}
