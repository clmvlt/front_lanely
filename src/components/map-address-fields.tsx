import { useTranslation } from "react-i18next"
import { FormField } from "@/components/form-field"
import { CountryField } from "@/components/country-field"
import { LocationPickerMap } from "@/features/map"
import type {
  AddressFieldsValue,
  AddressSuggestionResponse,
} from "@/lib/address-fields"

interface MapAddressFieldsProps {
  idPrefix: string
  value: AddressFieldsValue
  onChange: (next: AddressFieldsValue) => void
  disabled?: boolean
  /** Préfixe des chemins de fieldErrors, ex. "placeOfTakingOver.address". */
  errorPrefix?: string
  fieldErrors?: Record<string, string>
  /** Rôle du repère (couleur/forme). */
  tone?: "pickup" | "delivery" | "depot"
}

/**
 * Saisie d'adresse avec carte : champs postaux à gauche, carte Mapbox à droite
 * (recherche d'adresse superposée + marqueur déplaçable). Même expérience que la
 * saisie d'une adresse de client (`ClientAddressFormDialog`). Travaille sur un
 * `AddressFieldsValue` (adresse + lat/lon) ; la recherche pré-remplit les champs
 * et pose le point, le glisser/clic carte ajuste les coordonnées.
 */
export function MapAddressFields({
  idPrefix,
  value,
  onChange,
  disabled,
  errorPrefix,
  fieldErrors = {},
  tone = "depot",
}: MapAddressFieldsProps) {
  const { t } = useTranslation()

  const patch = (partial: Partial<AddressFieldsValue>) =>
    onChange({ ...value, ...partial })

  const err = (suffix: string) =>
    errorPrefix ? fieldErrors[`${errorPrefix}.${suffix}`] : undefined

  const onSelect = (suggestion: AddressSuggestionResponse) => {
    const street = [suggestion.houseNumber, suggestion.street]
      .filter(Boolean)
      .join(" ")
    patch({
      search: suggestion.label,
      line1: street || suggestion.label,
      postalCode: suggestion.postcode ?? value.postalCode,
      city: suggestion.city ?? value.city,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <FormField
          id={`${idPrefix}-line1`}
          label={t("company.legal.line1")}
          placeholder={t("company.legal.line1Placeholder")}
          value={value.line1}
          onChange={(e) => patch({ line1: e.target.value })}
          error={err("line1")}
          disabled={disabled}
          autoComplete="off"
        />
        <FormField
          id={`${idPrefix}-line2`}
          label={t("company.legal.line2")}
          placeholder={t("company.legal.line2Placeholder")}
          value={value.line2}
          onChange={(e) => patch({ line2: e.target.value })}
          error={err("line2")}
          disabled={disabled}
          autoComplete="off"
        />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField
            id={`${idPrefix}-postalCode`}
            label={t("company.legal.postalCode")}
            placeholder={t("company.legal.postalCodePlaceholder")}
            value={value.postalCode}
            onChange={(e) => patch({ postalCode: e.target.value })}
            error={err("postalCode")}
            disabled={disabled}
            autoComplete="off"
          />
          <FormField
            id={`${idPrefix}-city`}
            label={t("company.legal.city")}
            placeholder={t("company.legal.cityPlaceholder")}
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            error={err("city")}
            disabled={disabled}
            autoComplete="off"
          />
          <FormField
            id={`${idPrefix}-state`}
            label={t("company.legal.state")}
            placeholder={t("company.legal.statePlaceholder")}
            value={value.state}
            onChange={(e) => patch({ state: e.target.value })}
            error={err("state")}
            disabled={disabled}
            autoComplete="off"
          />
          <CountryField
            id={`${idPrefix}-country`}
            label={t("company.legal.country")}
            value={value.country}
            onChange={(country) => patch({ country })}
            error={err("country")}
            disabled={disabled}
            placeholder={t("clients.addresses.countryDefault")}
          />
        </div>
      </div>

      <section className="flex min-h-[18rem] flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {t("clients.addresses.locationHint")}
        </p>
        <LocationPickerMap
          latitude={value.latitude}
          longitude={value.longitude}
          onChange={(coord) =>
            patch({ latitude: coord.latitude, longitude: coord.longitude })
          }
          disabled={disabled}
          tone={tone}
          className="min-h-[16rem] flex-1"
          search={{
            id: `${idPrefix}-search`,
            label: t("transport.address.search"),
            placeholder: t("transport.address.searchPlaceholder"),
            query: value.search,
            onQueryChange: (text) => patch({ search: text }),
            onSelect,
          }}
        />
      </section>
    </div>
  )
}
