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
import { ClientCombobox } from "@/components/client-combobox"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  DETACH_CLIENT_ID,
  ROUNDING_MODES,
  useCreateTariff,
  useUpdateTariff,
  type CreateTariffRequest,
  type TariffResponse,
} from "@/features/pricing"

interface TariffFormDialogProps {
  companyId: string
  open: boolean
  /** Grille à éditer ; `null` = mode création. */
  tariff: TariffResponse | null
  onOpenChange: (open: boolean) => void
  onCreated?: (tariff: TariffResponse) => void
}

interface FormState {
  name: string
  description: string
  currency: string
  isDefault: boolean
  clientId: string | null
  clientName: string | null
  validFrom: string
  validUntil: string
  roundingMode: string
  roundingScale: string
  minChargeAmount: string
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    currency: "EUR",
    isDefault: false,
    clientId: null,
    clientName: null,
    validFrom: "",
    validUntil: "",
    roundingMode: "HALF_UP",
    roundingScale: "2",
    minChargeAmount: "",
  }
}

function toFormState(tariff: TariffResponse): FormState {
  return {
    name: tariff.name,
    description: tariff.description ?? "",
    currency: tariff.currency,
    isDefault: tariff.isDefault,
    clientId: tariff.clientId ?? null,
    clientName: null,
    validFrom: tariff.validFrom ?? "",
    validUntil: tariff.validUntil ?? "",
    roundingMode: tariff.roundingMode,
    roundingScale: String(tariff.roundingScale),
    minChargeAmount:
      tariff.minChargeAmount != null ? String(tariff.minChargeAmount) : "",
  }
}

function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function nf(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

export function TariffFormDialog({
  companyId,
  open,
  tariff,
  onOpenChange,
  onCreated,
}: TariffFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = tariff !== null
  const createTariff = useCreateTariff(companyId)
  const updateTariff = useUpdateTariff(companyId, tariff?.id ?? "")
  const mutation = isEdit ? updateTariff : createTariff

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(tariff ? toFormState(tariff) : emptyForm())
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tariff])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const roundingOptions = ROUNDING_MODES.map((value) => ({
    value,
    label: t(`pricing.roundingMode.${value}`),
  }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const base: CreateTariffRequest = {
      name: form.name.trim(),
      description: nz(form.description),
      currency: nz(form.currency) ?? "EUR",
      isDefault: form.isDefault,
      validFrom: nz(form.validFrom),
      validUntil: nz(form.validUntil),
      roundingMode: form.roundingMode as CreateTariffRequest["roundingMode"],
      roundingScale: nf(form.roundingScale),
      minChargeAmount: nf(form.minChargeAmount),
    }

    try {
      if (isEdit && tariff) {
        // PATCH partiel : pour détacher un client, envoyer la sentinelle.
        let clientId: string | null | undefined
        if (form.isDefault) {
          clientId = tariff.clientId ? DETACH_CLIENT_ID : undefined
        } else if (form.clientId) {
          clientId = form.clientId
        } else if (tariff.clientId) {
          clientId = DETACH_CLIENT_ID
        }
        await updateTariff.mutateAsync({ ...base, clientId })
        onOpenChange(false)
      } else {
        const created = await createTariff.mutateAsync({
          ...base,
          clientId: form.isDefault ? null : form.clientId,
        })
        onCreated?.(created)
        onOpenChange(false)
      }
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("pricing.form.editTitle")
              : t("pricing.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("pricing.form.editDescription")
              : t("pricing.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mutation.isError && !hasFieldErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <FormField
            id="tariffName"
            label={t("pricing.form.name")}
            placeholder={t("pricing.form.namePlaceholder")}
            value={form.name}
            onChange={(e) => set("name")(e.target.value)}
            maxLength={120}
            error={fieldErrors.name}
            autoComplete="off"
          />

          <TextareaField
            id="tariffDescription"
            label={t("pricing.form.description")}
            placeholder={t("pricing.form.descriptionPlaceholder")}
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
            error={fieldErrors.description}
            rows={2}
          />

          <div className="rounded-md border p-3">
            <CheckboxField
              id="tariffIsDefault"
              label={t("pricing.form.isDefault")}
              description={t("pricing.form.isDefaultHint")}
              checked={form.isDefault}
              onCheckedChange={(checked) =>
                setForm((prev) => ({
                  ...prev,
                  isDefault: checked,
                  clientId: checked ? null : prev.clientId,
                  clientName: checked ? null : prev.clientName,
                }))
              }
            />
            {!form.isDefault && (
              <div className="mt-3">
                <ClientCombobox
                  companyId={companyId}
                  id="tariffClient"
                  label={t("pricing.form.client")}
                  value={form.clientId}
                  selectedLabel={form.clientName ?? form.clientId}
                  onSelect={(client) =>
                    setForm((prev) => ({
                      ...prev,
                      clientId: client?.id ?? null,
                      clientName: client?.name ?? null,
                    }))
                  }
                  error={fieldErrors.clientId}
                />
              </div>
            )}
          </div>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="tariffValidFrom"
              type="date"
              label={t("pricing.form.validFrom")}
              value={form.validFrom}
              onChange={(e) => set("validFrom")(e.target.value)}
              error={fieldErrors.validFrom}
            />
            <FormField
              id="tariffValidUntil"
              type="date"
              label={t("pricing.form.validUntil")}
              value={form.validUntil}
              onChange={(e) => set("validUntil")(e.target.value)}
              error={fieldErrors.validUntil}
            />
          </div>

          <div className="grid gap-x-4 sm:grid-cols-3">
            <FormField
              id="tariffCurrency"
              label={t("pricing.form.currency")}
              value={form.currency}
              onChange={(e) =>
                set("currency")(e.target.value.toUpperCase().slice(0, 3))
              }
              maxLength={3}
              error={fieldErrors.currency}
              autoComplete="off"
            />
            <SelectField
              id="tariffRoundingMode"
              label={t("pricing.form.roundingMode")}
              value={form.roundingMode}
              onChange={set("roundingMode")}
              options={roundingOptions}
              error={fieldErrors.roundingMode}
            />
            <FormField
              id="tariffRoundingScale"
              type="number"
              min={0}
              max={6}
              label={t("pricing.form.roundingScale")}
              value={form.roundingScale}
              onChange={(e) => set("roundingScale")(e.target.value)}
              error={fieldErrors.roundingScale}
              autoComplete="off"
            />
          </div>

          <FormField
            id="tariffMinCharge"
            type="number"
            min={0}
            step="0.01"
            label={`${t("pricing.form.minChargeAmount")} (${t("common.taxExcluded")})`}
            hint={t("pricing.form.minChargeHint")}
            value={form.minChargeAmount}
            onChange={(e) => set("minChargeAmount")(e.target.value)}
            error={fieldErrors.minChargeAmount}
            autoComplete="off"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!form.name.trim()}
            >
              {isEdit ? t("common.save") : t("pricing.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
