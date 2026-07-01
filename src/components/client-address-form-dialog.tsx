import { useEffect, useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/form-field"
import { SelectField } from "@/components/select-field"
import { TextareaField } from "@/components/textarea-field"
import { CheckboxField } from "@/components/checkbox-field"
import { CountryField } from "@/components/country-field"
import { LocationPickerMap } from "@/features/map"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  useCreateAddress,
  useUpdateAddress,
  ADDRESS_TYPES,
  type AddressType,
  type ClientAddressResponse,
  type CreateClientAddressInput,
  type UpdateClientAddressInput,
  type PostalAddress,
} from "@/features/clients"
import type { AddressSuggestionResponse } from "@/lib/address-fields"

interface ClientAddressFormDialogProps {
  companyId: string
  clientId: string
  open: boolean
  /** Adresse à éditer (mode API) ; `null` = création. */
  address: ClientAddressResponse | null
  onOpenChange: (open: boolean) => void
  /**
   * Brouillon à éditer en mode local (client pas encore créé). Ignoré si
   * `address` est fourni.
   */
  draft?: CreateClientAddressInput | null
  /**
   * Si fourni, le formulaire travaille en local : il renvoie la saisie via ce
   * callback au lieu d'appeler l'API (utilisé pendant la création d'un client).
   */
  onSubmitDraft?: (input: CreateClientAddressInput) => void
}

interface FormState {
  /** Texte de la zone de recherche d'adresse (autocomplétion). */
  query: string
  label: string
  type: AddressType
  line1: string
  line2: string
  postalCode: string
  city: string
  state: string
  country: string
  latitude: string
  longitude: string
  contactName: string
  contactPhone: string
  contactEmail: string
  deliveryInstructions: string
  isPrimary: boolean
  isDefaultBilling: boolean
  isDefaultShipping: boolean
  active: boolean
}

function emptyForm(): FormState {
  return {
    query: "",
    label: "",
    type: "DEPOT",
    line1: "",
    line2: "",
    postalCode: "",
    city: "",
    state: "",
    country: "",
    latitude: "",
    longitude: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    deliveryInstructions: "",
    isPrimary: false,
    isDefaultBilling: false,
    isDefaultShipping: false,
    active: true,
  }
}

function toFormState(address: ClientAddressResponse): FormState {
  const a = address.address
  return {
    query: "",
    label: address.label ?? "",
    type: address.type,
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    postalCode: a.postalCode ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    country: a.country ?? "",
    latitude: address.latitude != null ? String(address.latitude) : "",
    longitude: address.longitude != null ? String(address.longitude) : "",
    contactName: address.contactName ?? "",
    contactPhone: address.contactPhone ?? "",
    contactEmail: address.contactEmail ?? "",
    deliveryInstructions: address.deliveryInstructions ?? "",
    isPrimary: address.isPrimary,
    isDefaultBilling: address.isDefaultBilling,
    isDefaultShipping: address.isDefaultShipping,
    active: address.active,
  }
}

function draftToFormState(input: CreateClientAddressInput): FormState {
  const a: Partial<PostalAddress> = input.address ?? {}
  return {
    query: "",
    label: input.label ?? "",
    type: input.type ?? "DEPOT",
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    postalCode: a.postalCode ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    country: a.country ?? "",
    latitude: input.latitude != null ? String(input.latitude) : "",
    longitude: input.longitude != null ? String(input.longitude) : "",
    contactName: input.contactName ?? "",
    contactPhone: input.contactPhone ?? "",
    contactEmail: input.contactEmail ?? "",
    deliveryInstructions: input.deliveryInstructions ?? "",
    isPrimary: input.isPrimary ?? false,
    isDefaultBilling: input.isDefaultBilling ?? false,
    isDefaultShipping: input.isDefaultShipping ?? false,
    active: true,
  }
}

function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function nzNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

export function ClientAddressFormDialog({
  companyId,
  clientId,
  open,
  address,
  onOpenChange,
  draft,
  onSubmitDraft,
}: ClientAddressFormDialogProps) {
  const { t } = useTranslation()
  const isDraftMode = typeof onSubmitDraft === "function"
  const isEdit = address !== null || (isDraftMode && draft != null)
  const createAddress = useCreateAddress(companyId, clientId)
  const updateAddress = useUpdateAddress(
    companyId,
    clientId,
    address?.id ?? "",
  )
  const mutation = address !== null ? updateAddress : createAddress

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(
      address
        ? toFormState(address)
        : draft
          ? draftToFormState(draft)
          : emptyForm(),
    )
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, address, draft])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const mapLat = nzNumber(form.latitude)
  const mapLon = nzNumber(form.longitude)

  // Sélection d'une suggestion : pré-remplit l'adresse postale ET pose le point
  // sur la carte (ajustable ensuite par glisser/clic).
  const handleSelectSuggestion = (suggestion: AddressSuggestionResponse) => {
    const line1 =
      [suggestion.houseNumber, suggestion.street]
        .filter((part) => Boolean(part && part.trim()))
        .join(" ") || suggestion.label
    setForm((prev) => ({
      ...prev,
      query: suggestion.label,
      line1,
      postalCode: suggestion.postcode ?? prev.postalCode,
      city: suggestion.city ?? prev.city,
      latitude: suggestion.latitude.toFixed(6),
      longitude: suggestion.longitude.toFixed(6),
    }))
  }

  const handleMapChange = (coord: { latitude: number; longitude: number }) => {
    setForm((prev) => ({
      ...prev,
      latitude: coord.latitude.toFixed(6),
      longitude: coord.longitude.toFixed(6),
    }))
  }

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const typeOptions = ADDRESS_TYPES.map((type) => ({
    value: type,
    label: t(`clients.addressType.${type}`),
  }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    // Le dialog est porté dans un portal mais reste un descendant React du
    // formulaire de création de client : sans cela, l'événement submit
    // remonterait jusqu'à lui et déclencherait la création du client.
    event.stopPropagation()

    const addressBlock = {
      line1: nz(form.line1),
      line2: nz(form.line2),
      postalCode: nz(form.postalCode),
      city: nz(form.city),
      state: nz(form.state),
      country: nz(form.country),
    }

    const base = {
      label: nz(form.label),
      type: form.type,
      address: addressBlock,
      latitude: nzNumber(form.latitude),
      longitude: nzNumber(form.longitude),
      contactName: nz(form.contactName),
      contactPhone: nz(form.contactPhone),
      contactEmail: nz(form.contactEmail),
      deliveryInstructions: nz(form.deliveryInstructions),
      isPrimary: form.isPrimary,
      isDefaultBilling: form.isDefaultBilling,
      isDefaultShipping: form.isDefaultShipping,
    }

    if (isDraftMode) {
      onSubmitDraft!(base)
      onOpenChange(false)
      return
    }

    try {
      if (address !== null) {
        const input: UpdateClientAddressInput = { ...base, active: form.active }
        await updateAddress.mutateAsync(input)
      } else {
        const input: CreateClientAddressInput = base
        await createAddress.mutateAsync(input)
      }
      onOpenChange(false)
    } catch {
      /* erreur affichée via mutation.error */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("clients.addresses.editTitle")
              : t("clients.addresses.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("clients.addresses.formDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {mutation.isError && !hasFieldErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormField
                  id="addressLabel"
                  label={t("clients.addresses.label")}
                  placeholder={t("clients.addresses.labelPlaceholder")}
                  value={form.label}
                  onChange={(e) => set("label")(e.target.value)}
                  error={fieldErrors.label}
                  autoComplete="off"
                />
                <SelectField
                  id="addressType"
                  label={t("clients.addresses.type")}
                  value={form.type}
                  onChange={(v) => set("type")(v as AddressType)}
                  options={typeOptions}
                  error={fieldErrors.type}
                />
              </div>

              <FormField
                id="addressLine1"
                label={t("company.legal.line1")}
                placeholder={t("company.legal.line1Placeholder")}
                value={form.line1}
                onChange={(e) => set("line1")(e.target.value)}
                error={fieldErrors["address.line1"]}
                autoComplete="off"
              />
              <FormField
                id="addressLine2"
                label={t("company.legal.line2")}
                placeholder={t("company.legal.line2Placeholder")}
                value={form.line2}
                onChange={(e) => set("line2")(e.target.value)}
                error={fieldErrors["address.line2"]}
                autoComplete="off"
              />
              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormField
                  id="addressPostalCode"
                  label={t("company.legal.postalCode")}
                  placeholder={t("company.legal.postalCodePlaceholder")}
                  value={form.postalCode}
                  onChange={(e) => set("postalCode")(e.target.value)}
                  error={fieldErrors["address.postalCode"]}
                  autoComplete="off"
                />
                <FormField
                  id="addressCity"
                  label={t("company.legal.city")}
                  placeholder={t("company.legal.cityPlaceholder")}
                  value={form.city}
                  onChange={(e) => set("city")(e.target.value)}
                  error={fieldErrors["address.city"]}
                  autoComplete="off"
                />
                <FormField
                  id="addressState"
                  label={t("company.legal.state")}
                  placeholder={t("company.legal.statePlaceholder")}
                  value={form.state}
                  onChange={(e) => set("state")(e.target.value)}
                  error={fieldErrors["address.state"]}
                  autoComplete="off"
                />
                <CountryField
                  id="addressCountry"
                  label={t("company.legal.country")}
                  value={form.country}
                  onChange={set("country")}
                  error={fieldErrors["address.country"]}
                  placeholder={t("clients.addresses.countryDefault")}
                />
              </div>

              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormField
                  id="addressContactName"
                  label={t("clients.addresses.contactName")}
                  value={form.contactName}
                  onChange={(e) => set("contactName")(e.target.value)}
                  error={fieldErrors.contactName}
                  autoComplete="off"
                />
                <FormField
                  id="addressContactPhone"
                  label={t("clients.addresses.contactPhone")}
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone")(e.target.value)}
                  error={fieldErrors.contactPhone}
                  autoComplete="off"
                />
              </div>
              <FormField
                id="addressContactEmail"
                type="email"
                label={t("clients.addresses.contactEmail")}
                placeholder={t("common.placeholders.email")}
                value={form.contactEmail}
                onChange={(e) => set("contactEmail")(e.target.value)}
                error={fieldErrors.contactEmail}
                autoComplete="off"
              />
              <TextareaField
                id="addressInstructions"
                label={t("clients.addresses.deliveryInstructions")}
                placeholder={t(
                  "clients.addresses.deliveryInstructionsPlaceholder",
                )}
                value={form.deliveryInstructions}
                onChange={(e) => set("deliveryInstructions")(e.target.value)}
                error={fieldErrors.deliveryInstructions}
                rows={2}
              />

              <div className="grid gap-3">
                <CheckboxField
                  id="addressIsPrimary"
                  label={t("clients.addresses.isPrimary")}
                  checked={form.isPrimary}
                  onCheckedChange={set("isPrimary")}
                />
                <CheckboxField
                  id="addressIsDefaultBilling"
                  label={t("clients.addresses.isDefaultBilling")}
                  checked={form.isDefaultBilling}
                  onCheckedChange={set("isDefaultBilling")}
                />
                <CheckboxField
                  id="addressIsDefaultShipping"
                  label={t("clients.addresses.isDefaultShipping")}
                  checked={form.isDefaultShipping}
                  onCheckedChange={set("isDefaultShipping")}
                />
                {address !== null && (
                  <CheckboxField
                    id="addressActive"
                    label={t("clients.addresses.active")}
                    checked={form.active}
                    onCheckedChange={set("active")}
                  />
                )}
              </div>
            </div>

            <section className="flex min-h-[20rem] flex-col gap-2">
              <h3 className="text-sm font-medium text-foreground">
                {t("clients.addresses.location")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("clients.addresses.locationHint")}
              </p>
              <LocationPickerMap
                latitude={mapLat}
                longitude={mapLon}
                onChange={handleMapChange}
                tone="depot"
                hint={t("clients.addresses.mapHint")}
                emptyHint={t("clients.addresses.mapEmpty")}
                className="min-h-[18rem] flex-1"
                search={{
                  id: "addressSearch",
                  label: t("clients.addresses.search"),
                  placeholder: t("clients.addresses.searchPlaceholder"),
                  query: form.query,
                  onQueryChange: set("query"),
                  onSelect: handleSelectSuggestion,
                }}
              />
            </section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? t("common.save") : t("clients.addresses.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
