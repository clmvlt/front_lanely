import { useState } from "react"
import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Warehouse } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/form-field"
import { CountryField } from "@/components/country-field"
import { LocationPickerMap } from "@/features/map"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { DEFAULT_COUNTRY } from "@/lib/countries"
import {
  toUpdateCompanyInput,
  useCompanyDetail,
  useUpdateCompany,
} from "@/features/companies"
import type { CompanyResponse } from "@/features/companies"
import type { AddressSuggestionResponse } from "@/lib/address-fields"

interface CompanyDepositCardProps {
  companyId: string
  canManage: boolean
}

interface FormState {
  /** Texte de la zone de recherche d'adresse (autocomplétion). */
  query: string
  line1: string
  line2: string
  postalCode: string
  city: string
  state: string
  country: string
  /** Coordonnées saisies sous forme de texte (validées au moment de l'envoi). */
  latitude: string
  longitude: string
}

function toFormState(company: CompanyResponse): FormState {
  const addr = company.depositAddress?.address
  const coord = company.depositAddress?.coordinate
  return {
    query: "",
    line1: addr?.line1 ?? "",
    line2: addr?.line2 ?? "",
    postalCode: addr?.postalCode ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    country: addr?.country ?? DEFAULT_COUNTRY,
    latitude: coord ? String(coord.latitude) : "",
    longitude: coord ? String(coord.longitude) : "",
  }
}

/** "" → null, en supprimant les espaces superflus. */
function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** Convertit un texte en nombre fini, sinon `null`. */
function toFiniteNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** Champs réellement enregistrés (le texte de recherche `query` est exclu). */
const SAVED_KEYS: (keyof FormState)[] = [
  "line1",
  "line2",
  "postalCode",
  "city",
  "state",
  "country",
  "latitude",
  "longitude",
]

/** Vrai si un champ enregistrable diffère de l'état initial. */
function isDirty(a: FormState, b: FormState): boolean {
  return SAVED_KEYS.some((key) => a[key].trim() !== b[key].trim())
}

export function CompanyDepositCard({
  companyId,
  canManage,
}: CompanyDepositCardProps) {
  const { t } = useTranslation()
  const detailQuery = useCompanyDetail(companyId)
  const updateCompany = useUpdateCompany(companyId)

  const company = detailQuery.data
  const [form, setForm] = useState<FormState | null>(null)
  // Référence pour détecter les modifications (active le bouton Enregistrer).
  const [initialForm, setInitialForm] = useState<FormState | null>(null)
  const [saved, setSaved] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)
  if (company && syncedId !== company.id) {
    const initial = toFormState(company)
    setForm(initial)
    setInitialForm(initial)
    setSyncedId(company.id)
  }

  if (detailQuery.isLoading || !company || !form || !initialForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="size-4 text-muted-foreground" />
            {t("company.deposit.title")}
          </CardTitle>
          <CardDescription>{t("company.deposit.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {detailQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(detailQuery.error)}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const disabled = !canManage
  const dirty = isDirty(form, initialForm)
  const fieldErrors = getFieldErrors(updateCompany.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const mapLat = toFiniteNumber(form.latitude)
  const mapLon = toFiniteNumber(form.longitude)

  // Sélection d'une suggestion : pré-remplit l'adresse ET pose le point sur la
  // carte (ajustable ensuite par glisser/clic).
  const handleSelectSuggestion = (suggestion: AddressSuggestionResponse) => {
    const line1 =
      [suggestion.houseNumber, suggestion.street]
        .filter((part) => Boolean(part && part.trim()))
        .join(" ") || suggestion.label
    setForm((prev) =>
      prev
        ? {
            ...prev,
            query: suggestion.label,
            line1,
            postalCode: suggestion.postcode ?? prev.postalCode,
            city: suggestion.city ?? prev.city,
            latitude: suggestion.latitude.toFixed(6),
            longitude: suggestion.longitude.toFixed(6),
          }
        : prev,
    )
  }

  const handleMapChange = (coord: { latitude: number; longitude: number }) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            latitude: coord.latitude.toFixed(6),
            longitude: coord.longitude.toFixed(6),
          }
        : prev,
    )
  }

  const handleClear = () => {
    setForm({
      query: "",
      line1: "",
      line2: "",
      postalCode: "",
      city: "",
      state: "",
      country: DEFAULT_COUNTRY,
      latitude: "",
      longitude: "",
    })
    setSaved(false)
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)

    // Coordonnée posée via la carte / la recherche (toujours valide), les deux
    // ensemble ou aucune.
    const coordinate =
      typeof mapLat === "number" && typeof mapLon === "number"
        ? { latitude: mapLat, longitude: mapLon }
        : null

    const addressFields = {
      line1: nz(form.line1),
      line2: nz(form.line2),
      postalCode: nz(form.postalCode),
      city: nz(form.city),
      state: nz(form.state),
    }
    const hasAddress = Object.values(addressFields).some((v) => v !== null)
    const address = hasAddress
      ? { ...addressFields, country: nz(form.country) ?? DEFAULT_COUNTRY }
      : null

    const depositAddress =
      address || coordinate ? { address, coordinate } : null

    try {
      // PATCH = remplacement complet : on repart de l'état courant (nom, légal,
      // facturation) et on ne remplace que le dépôt.
      await updateCompany.mutateAsync({
        ...toUpdateCompanyInput(company),
        depositAddress,
      })
      // L'état enregistré devient la nouvelle référence (bouton de nouveau inactif).
      setInitialForm({ ...form })
      setSaved(true)
    } catch {
      /* erreur affichée via updateCompany.error */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Warehouse className="size-4 text-muted-foreground" />
          {t("company.deposit.title")}
        </CardTitle>
        <CardDescription>{t("company.deposit.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {updateCompany.isError && !hasFieldErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(updateCompany.error)}
              </AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>{t("company.deposit.saved")}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-foreground">
                {t("company.deposit.address")}
              </h3>
              <FormField
                id="depositLine1"
                label={t("company.deposit.line1")}
                placeholder={t("company.deposit.line1Placeholder")}
                value={form.line1}
                onChange={(e) => set("line1")(e.target.value)}
                error={fieldErrors["depositAddress.address.line1"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="depositLine2"
                label={t("company.deposit.line2")}
                placeholder={t("company.deposit.line2Placeholder")}
                value={form.line2}
                onChange={(e) => set("line2")(e.target.value)}
                error={fieldErrors["depositAddress.address.line2"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormField
                  id="depositPostalCode"
                  label={t("company.deposit.postalCode")}
                  placeholder={t("company.deposit.postalCodePlaceholder")}
                  value={form.postalCode}
                  onChange={(e) => set("postalCode")(e.target.value)}
                  error={fieldErrors["depositAddress.address.postalCode"]}
                  disabled={disabled}
                  readOnly={disabled}
                />
                <FormField
                  id="depositCity"
                  label={t("company.deposit.city")}
                  placeholder={t("company.deposit.cityPlaceholder")}
                  value={form.city}
                  onChange={(e) => set("city")(e.target.value)}
                  error={fieldErrors["depositAddress.address.city"]}
                  disabled={disabled}
                  readOnly={disabled}
                />
                <FormField
                  id="depositState"
                  label={t("company.deposit.state")}
                  placeholder={t("company.deposit.statePlaceholder")}
                  value={form.state}
                  onChange={(e) => set("state")(e.target.value)}
                  error={fieldErrors["depositAddress.address.state"]}
                  disabled={disabled}
                  readOnly={disabled}
                />
                <CountryField
                  id="depositCountry"
                  label={t("company.deposit.country")}
                  value={form.country}
                  onChange={set("country")}
                  error={fieldErrors["depositAddress.address.country"]}
                  disabled={disabled}
                />
              </div>
            </section>

            <section className="flex min-h-[20rem] flex-col gap-3">
              <h3 className="text-sm font-medium text-foreground">
                {t("company.deposit.location")}
              </h3>
              <LocationPickerMap
                latitude={mapLat}
                longitude={mapLon}
                onChange={handleMapChange}
                disabled={disabled}
                tone="depot"
                hint={t("company.deposit.mapHint")}
                emptyHint={t("company.deposit.mapEmpty")}
                className="min-h-[18rem] flex-1"
                search={
                  canManage
                    ? {
                        id: "depositSearch",
                        label: t("company.deposit.search"),
                        placeholder: t("company.deposit.searchPlaceholder"),
                        query: form.query,
                        onQueryChange: set("query"),
                        onSelect: handleSelectSuggestion,
                      }
                    : undefined
                }
              />
            </section>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={updateCompany.isPending || !dirty}>
                {t("common.save")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={updateCompany.isPending}
              >
                {t("company.deposit.clear")}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
