import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, Pencil } from "lucide-react"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { FormField } from "@/components/form-field"
import { CountryField } from "@/components/country-field"
import { cn } from "@/lib/utils"
import type {
  AddressFieldsValue,
  AddressSuggestionResponse,
} from "@/lib/address-fields"

interface AddressFieldsProps {
  idPrefix: string
  value: AddressFieldsValue
  onChange: (next: AddressFieldsValue) => void
  disabled?: boolean
  /** Préfixe des chemins de fieldErrors, ex. "shipper.address" ou "depot". */
  errorPrefix?: string
  fieldErrors?: Record<string, string>
}

export function AddressFields({
  idPrefix,
  value,
  onChange,
  disabled,
  errorPrefix,
  fieldErrors = {},
}: AddressFieldsProps) {
  const { t } = useTranslation()

  const patch = (partial: Partial<AddressFieldsValue>) =>
    onChange({ ...value, ...partial })

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

  const err = (suffix: string) =>
    errorPrefix ? fieldErrors[`${errorPrefix}.${suffix}`] : undefined

  const coordsKnown =
    typeof value.latitude === "number" && typeof value.longitude === "number"
  const hasManual = Boolean(
    value.line1 ||
      value.line2 ||
      value.postalCode ||
      value.city ||
      value.state ||
      value.country,
  )
  // Champs détaillés repliés par défaut : la recherche d'adresse suffit dans la
  // plupart des cas. On les ouvre d'office s'il y a déjà une saisie manuelle.
  const fieldErrorKeys = ["line1", "line2", "postalCode", "city", "state", "country"]
  const hasFieldError = fieldErrorKeys.some((k) => err(k))
  const [expanded, setExpanded] = useState(hasManual || hasFieldError)

  return (
    <div className="grid gap-3">
      <AddressAutocomplete
        id={`${idPrefix}-search`}
        label={t("transport.address.search")}
        query={value.search}
        onQueryChange={(text) => patch({ search: text })}
        onSelect={onSelect}
        biasLat={value.latitude}
        biasLon={value.longitude}
        placeholder={t("transport.address.searchPlaceholder")}
        disabled={disabled}
        hint={
          coordsKnown
            ? t("transport.address.coordsSet")
            : t("transport.address.coordsHint")
        }
      />

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={disabled}
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          <Pencil className="size-3.5" />
          {hasManual
            ? t("transport.address.editManual")
            : t("transport.address.addManual")}
        </button>
      ) : (
        <div className="grid gap-3 rounded-md bg-accent/40 p-3">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform")} />
            {t("transport.address.manualTitle")}
          </button>
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
      )}
    </div>
  )
}
