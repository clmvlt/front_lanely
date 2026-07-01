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
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  PRICING_BASES,
  useAddTariffComponent,
  useUpdateTariffComponent,
  type CreateTariffComponentRequest,
  type PricingBasis,
  type TariffComponentDto,
} from "@/features/pricing"

interface TariffComponentDialogProps {
  companyId: string
  tariffId: string
  open: boolean
  /** Ligne à éditer ; `null` = ajout. */
  component: TariffComponentDto | null
  onOpenChange: (open: boolean) => void
}

interface FormState {
  label: string
  basis: PricingBasis
  unitPrice: string
  includedQuantity: string
  minQuantity: string
  maxQuantity: string
  minAmount: string
  maxAmount: string
}

function emptyForm(): FormState {
  return {
    label: "",
    basis: "PER_KM",
    unitPrice: "",
    includedQuantity: "",
    minQuantity: "",
    maxQuantity: "",
    minAmount: "",
    maxAmount: "",
  }
}

function toFormState(c: TariffComponentDto): FormState {
  const s = (v: number | null | undefined) => (v == null ? "" : String(v))
  return {
    label: c.label,
    basis: c.basis,
    unitPrice: String(c.unitPrice),
    includedQuantity: s(c.includedQuantity),
    minQuantity: s(c.minQuantity),
    maxQuantity: s(c.maxQuantity),
    minAmount: s(c.minAmount),
    maxAmount: s(c.maxAmount),
  }
}

function nf(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

export function TariffComponentDialog({
  companyId,
  tariffId,
  open,
  component,
  onOpenChange,
}: TariffComponentDialogProps) {
  const { t } = useTranslation()
  const isEdit = component !== null
  const addComponent = useAddTariffComponent(companyId, tariffId)
  const updateComponent = useUpdateTariffComponent(companyId, tariffId)
  const mutation = isEdit ? updateComponent : addComponent

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(component ? toFormState(component) : emptyForm())
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, component])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const isPercent = form.basis === "PERCENT_OF_SUBTOTAL"

  const basisOptions = PRICING_BASES.map((value) => ({
    value,
    label: t(`pricing.basis.${value}`),
  }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const input: CreateTariffComponentRequest = {
      label: form.label.trim(),
      basis: form.basis,
      unitPrice: nf(form.unitPrice) ?? 0,
      includedQuantity: nf(form.includedQuantity),
      minQuantity: nf(form.minQuantity),
      maxQuantity: nf(form.maxQuantity),
      minAmount: nf(form.minAmount),
      maxAmount: nf(form.maxAmount),
    }
    try {
      if (isEdit && component) {
        await updateComponent.mutateAsync({ componentId: component.id, input })
      } else {
        await addComponent.mutateAsync(input)
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("pricing.component.editTitle")
              : t("pricing.component.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("pricing.detail.componentsHint")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mutation.isError && !hasFieldErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="componentLabel"
              label={t("pricing.component.label")}
              placeholder={t("pricing.component.labelPlaceholder")}
              value={form.label}
              onChange={(e) => set("label")(e.target.value)}
              maxLength={120}
              error={fieldErrors.label}
              autoComplete="off"
            />
            <SelectField
              id="componentBasis"
              label={t("pricing.component.basis")}
              value={form.basis}
              onChange={(v) => set("basis")(v as PricingBasis)}
              options={basisOptions}
              error={fieldErrors.basis}
            />
          </div>

          <FormField
            id="componentUnitPrice"
            type="number"
            min={0}
            step="0.0001"
            label={
              isPercent
                ? t("pricing.component.unitPrice")
                : `${t("pricing.component.unitPrice")} (${t("common.taxExcluded")})`
            }
            hint={isPercent ? t("pricing.component.unitPricePercentHint") : undefined}
            value={form.unitPrice}
            onChange={(e) => set("unitPrice")(e.target.value)}
            error={fieldErrors.unitPrice}
            autoComplete="off"
          />

          <div className="grid gap-x-4 sm:grid-cols-3">
            <FormField
              id="componentIncluded"
              type="number"
              step="any"
              label={t("pricing.component.includedQuantity")}
              hint={t("pricing.component.includedQuantityHint")}
              value={form.includedQuantity}
              onChange={(e) => set("includedQuantity")(e.target.value)}
              error={fieldErrors.includedQuantity}
              autoComplete="off"
            />
            <FormField
              id="componentMinQty"
              type="number"
              step="any"
              label={t("pricing.component.minQuantity")}
              value={form.minQuantity}
              onChange={(e) => set("minQuantity")(e.target.value)}
              error={fieldErrors.minQuantity}
              autoComplete="off"
            />
            <FormField
              id="componentMaxQty"
              type="number"
              step="any"
              label={t("pricing.component.maxQuantity")}
              value={form.maxQuantity}
              onChange={(e) => set("maxQuantity")(e.target.value)}
              error={fieldErrors.maxQuantity}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="componentMinAmount"
              type="number"
              step="0.01"
              label={`${t("pricing.component.minAmount")} (${t("common.taxExcluded")})`}
              value={form.minAmount}
              onChange={(e) => set("minAmount")(e.target.value)}
              error={fieldErrors.minAmount}
              autoComplete="off"
            />
            <FormField
              id="componentMaxAmount"
              type="number"
              step="0.01"
              label={`${t("pricing.component.maxAmount")} (${t("common.taxExcluded")})`}
              value={form.maxAmount}
              onChange={(e) => set("maxAmount")(e.target.value)}
              error={fieldErrors.maxAmount}
              autoComplete="off"
            />
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
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!form.label.trim() || form.unitPrice.trim() === ""}
            >
              {isEdit ? t("common.save") : t("pricing.component.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
