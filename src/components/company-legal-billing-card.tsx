import { useState } from "react"
import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Receipt } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/form-field"
import { CountryField } from "@/components/country-field"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { DEFAULT_COUNTRY } from "@/lib/countries"
import { useCompanyDetail, useUpdateCompany } from "@/features/companies"
import type { CompanyResponse } from "@/features/companies"

interface CompanyLegalBillingCardProps {
  companyId: string
  canManage: boolean
}

interface FormState {
  legalName: string
  registrationNumber: string
  vatNumber: string
  legalForm: string
  line1: string
  line2: string
  postalCode: string
  city: string
  state: string
  country: string
  billingEmail: string
  billingPhone: string
}

function toFormState(company: CompanyResponse): FormState {
  const legal = company.legalInfo
  const addr = company.billingAddress
  return {
    legalName: legal?.legalName ?? "",
    registrationNumber: legal?.registrationNumber ?? "",
    vatNumber: legal?.vatNumber ?? "",
    legalForm: legal?.legalForm ?? "",
    line1: addr?.line1 ?? "",
    line2: addr?.line2 ?? "",
    postalCode: addr?.postalCode ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    country: addr?.country ?? DEFAULT_COUNTRY,
    billingEmail: company.billingEmail ?? "",
    billingPhone: company.billingPhone ?? "",
  }
}

/** "" → null, en supprimant les espaces superflus. */
function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** Vrai si un champ diffère de l'état initial (active le bouton Enregistrer). */
function isDirty(a: FormState, b: FormState): boolean {
  return (Object.keys(a) as (keyof FormState)[]).some(
    (key) => a[key].trim() !== b[key].trim(),
  )
}

export function CompanyLegalBillingCard({
  companyId,
  canManage,
}: CompanyLegalBillingCardProps) {
  const { t } = useTranslation()
  const detailQuery = useCompanyDetail(companyId)
  const updateCompany = useUpdateCompany(companyId)

  const company = detailQuery.data
  const [form, setForm] = useState<FormState | null>(null)
  // Référence pour détecter les modifications (active le bouton Enregistrer).
  const [initialForm, setInitialForm] = useState<FormState | null>(null)
  const [saved, setSaved] = useState(false)
  // Initialise (ou réinitialise) le formulaire dès que la société est chargée.
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
            <Receipt className="size-4 text-muted-foreground" />
            {t("company.legal.title")}
          </CardTitle>
          <CardDescription>{t("company.legal.description")}</CardDescription>
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

  const fieldErrors = getFieldErrors(updateCompany.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const disabled = !canManage
  const dirty = isDirty(form, initialForm)

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaved(false)

    const legalInfo = {
      legalName: nz(form.legalName),
      registrationNumber: nz(form.registrationNumber),
      vatNumber: nz(form.vatNumber),
      legalForm: nz(form.legalForm),
    }
    const hasLegal = Object.values(legalInfo).some((v) => v !== null)

    const addressFields = {
      line1: nz(form.line1),
      line2: nz(form.line2),
      postalCode: nz(form.postalCode),
      city: nz(form.city),
      state: nz(form.state),
    }
    const hasAddress = Object.values(addressFields).some((v) => v !== null)

    try {
      // PATCH = remplacement complet : on renvoie tout l'état éditable, le `name`
      // courant inclus pour ne pas l'écraser.
      await updateCompany.mutateAsync({
        name: company.name,
        legalInfo: hasLegal ? legalInfo : null,
        billingAddress: hasAddress
          ? { ...addressFields, country: nz(form.country) ?? DEFAULT_COUNTRY }
          : null,
        billingEmail: nz(form.billingEmail),
        billingPhone: nz(form.billingPhone),
        // PATCH = remplacement complet : on renvoie le dépôt courant tel quel
        // pour ne pas l'effacer (il est édité par CompanyDepositCard).
        depositAddress: company.depositAddress,
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
          <Receipt className="size-4 text-muted-foreground" />
          {t("company.legal.title")}
        </CardTitle>
        <CardDescription>{t("company.legal.description")}</CardDescription>
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
              <AlertDescription>{t("company.legal.saved")}</AlertDescription>
            </Alert>
          )}

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("company.legal.legalInfo")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="legalName"
                label={t("company.legal.legalName")}
                placeholder={t("company.legal.legalNamePlaceholder")}
                value={form.legalName}
                onChange={(e) => set("legalName")(e.target.value)}
                error={fieldErrors["legalInfo.legalName"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="legalForm"
                label={t("company.legal.legalForm")}
                placeholder={t("company.legal.legalFormPlaceholder")}
                value={form.legalForm}
                onChange={(e) => set("legalForm")(e.target.value)}
                error={fieldErrors["legalInfo.legalForm"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="registrationNumber"
                label={t("company.legal.registrationNumber")}
                placeholder={t("company.legal.registrationNumberPlaceholder")}
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber")(e.target.value)}
                error={fieldErrors["legalInfo.registrationNumber"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="vatNumber"
                label={t("company.legal.vatNumber")}
                placeholder={t("company.legal.vatNumberPlaceholder")}
                value={form.vatNumber}
                onChange={(e) => set("vatNumber")(e.target.value)}
                error={fieldErrors["legalInfo.vatNumber"]}
                disabled={disabled}
                readOnly={disabled}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("company.legal.billingAddress")}
            </h3>
            <FormField
              id="line1"
              label={t("company.legal.line1")}
              placeholder={t("company.legal.line1Placeholder")}
              value={form.line1}
              onChange={(e) => set("line1")(e.target.value)}
              error={fieldErrors["billingAddress.line1"]}
              disabled={disabled}
              readOnly={disabled}
            />
            <FormField
              id="line2"
              label={t("company.legal.line2")}
              placeholder={t("company.legal.line2Placeholder")}
              value={form.line2}
              onChange={(e) => set("line2")(e.target.value)}
              error={fieldErrors["billingAddress.line2"]}
              disabled={disabled}
              readOnly={disabled}
            />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="postalCode"
                label={t("company.legal.postalCode")}
                placeholder={t("company.legal.postalCodePlaceholder")}
                value={form.postalCode}
                onChange={(e) => set("postalCode")(e.target.value)}
                error={fieldErrors["billingAddress.postalCode"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="city"
                label={t("company.legal.city")}
                placeholder={t("company.legal.cityPlaceholder")}
                value={form.city}
                onChange={(e) => set("city")(e.target.value)}
                error={fieldErrors["billingAddress.city"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="state"
                label={t("company.legal.state")}
                placeholder={t("company.legal.statePlaceholder")}
                value={form.state}
                onChange={(e) => set("state")(e.target.value)}
                error={fieldErrors["billingAddress.state"]}
                disabled={disabled}
                readOnly={disabled}
              />
              <CountryField
                id="country"
                label={t("company.legal.country")}
                value={form.country}
                onChange={set("country")}
                error={fieldErrors["billingAddress.country"]}
                disabled={disabled}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("company.legal.billingContact")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="billingEmail"
                type="email"
                label={t("company.legal.billingEmail")}
                placeholder={t("company.legal.billingEmailPlaceholder")}
                value={form.billingEmail}
                onChange={(e) => set("billingEmail")(e.target.value)}
                error={fieldErrors.billingEmail}
                disabled={disabled}
                readOnly={disabled}
              />
              <FormField
                id="billingPhone"
                label={t("company.legal.billingPhone")}
                placeholder={t("company.legal.billingPhonePlaceholder")}
                value={form.billingPhone}
                onChange={(e) => set("billingPhone")(e.target.value)}
                hint={t("company.legal.billingPhoneHint")}
                error={fieldErrors.billingPhone}
                disabled={disabled}
                readOnly={disabled}
              />
            </div>
          </section>

          {canManage && (
            <div>
              <Button
                type="submit"
                disabled={updateCompany.isPending || !dirty}
              >
                {t("common.save")}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
