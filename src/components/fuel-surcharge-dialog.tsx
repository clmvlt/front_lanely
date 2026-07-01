import { useEffect, useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Plus, Trash2 } from "lucide-react"
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
import { CheckboxField } from "@/components/checkbox-field"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  FUEL_SURCHARGE_MODES,
  INDEXED_FUEL_TYPES,
  PRICING_BASES,
  useUpsertFuelSurcharge,
  type FuelSurchargeComponentInput,
  type FuelSurchargeMode,
  type FuelSurchargePolicyResponse,
  type FuelType,
  type PricingBasis,
  type UpsertFuelSurchargePolicyRequest,
} from "@/features/pricing"

interface FuelSurchargeDialogProps {
  companyId: string
  tariffId: string
  open: boolean
  /** Politique existante (préremplit le formulaire) ou `null`. */
  policy: FuelSurchargePolicyResponse | null
  onOpenChange: (open: boolean) => void
}

interface SurchargeLine {
  label: string
  basis: PricingBasis
  unitPrice: string
}

interface FormState {
  enabled: boolean
  fuelType: FuelType
  mode: FuelSurchargeMode
  thresholdPrice: string
  referencePrice: string
  dieselShareRatio: string
  clampAtZero: boolean
  sourceFilter: string
  surchargeComponents: SurchargeLine[]
}

function emptyForm(): FormState {
  return {
    enabled: true,
    fuelType: "DIESEL",
    mode: "THRESHOLD_COMPONENTS",
    thresholdPrice: "",
    referencePrice: "",
    dieselShareRatio: "",
    clampAtZero: true,
    sourceFilter: "",
    surchargeComponents: [],
  }
}

function toFormState(p: FuelSurchargePolicyResponse): FormState {
  const s = (v: number | null | undefined) => (v == null ? "" : String(v))
  return {
    enabled: p.enabled,
    fuelType: p.fuelType,
    mode: p.mode,
    thresholdPrice: s(p.thresholdPrice),
    referencePrice: s(p.referencePrice),
    dieselShareRatio: s(p.dieselShareRatio),
    clampAtZero: p.clampAtZero,
    sourceFilter: p.sourceFilter ?? "",
    surchargeComponents: p.surchargeComponents.map((c) => ({
      label: c.label,
      basis: c.basis,
      unitPrice: String(c.unitPrice),
    })),
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

export function FuelSurchargeDialog({
  companyId,
  tariffId,
  open,
  policy,
  onOpenChange,
}: FuelSurchargeDialogProps) {
  const { t } = useTranslation()
  const upsert = useUpsertFuelSurcharge(companyId, tariffId)

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(policy ? toFormState(policy) : emptyForm())
    upsert.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(upsert.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const isThreshold = form.mode === "THRESHOLD_COMPONENTS"

  const fuelOptions = INDEXED_FUEL_TYPES.map((value) => ({
    value,
    label: t(`pricing.fuelType.${value}`),
  }))
  const modeOptions = FUEL_SURCHARGE_MODES.map((value) => ({
    value,
    label: t(`pricing.fuelMode.${value}`),
  }))
  const basisOptions = PRICING_BASES.map((value) => ({
    value,
    label: t(`pricing.basis.${value}`),
  }))

  const updateLine = (index: number, patch: Partial<SurchargeLine>) =>
    setForm((prev) => ({
      ...prev,
      surchargeComponents: prev.surchargeComponents.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    }))

  const addLine = () =>
    setForm((prev) => ({
      ...prev,
      surchargeComponents: [
        ...prev.surchargeComponents,
        { label: "", basis: "PER_KM", unitPrice: "" },
      ],
    }))

  const removeLine = (index: number) =>
    setForm((prev) => ({
      ...prev,
      surchargeComponents: prev.surchargeComponents.filter(
        (_, i) => i !== index,
      ),
    }))

  const canSubmit = isThreshold
    ? form.thresholdPrice.trim() !== ""
    : form.referencePrice.trim() !== "" && form.dieselShareRatio.trim() !== ""

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const surchargeComponents: FuelSurchargeComponentInput[] =
      form.surchargeComponents
        .filter((line) => line.label.trim() !== "")
        .map((line, index) => ({
          label: line.label.trim(),
          basis: line.basis,
          unitPrice: nf(line.unitPrice) ?? 0,
          position: index + 1,
        }))

    const input: UpsertFuelSurchargePolicyRequest = {
      enabled: form.enabled,
      fuelType: form.fuelType,
      mode: form.mode,
      thresholdPrice: isThreshold ? nf(form.thresholdPrice) : null,
      referencePrice: isThreshold ? null : nf(form.referencePrice),
      dieselShareRatio: isThreshold ? null : nf(form.dieselShareRatio),
      clampAtZero: form.clampAtZero,
      sourceFilter: nz(form.sourceFilter),
      surchargeComponents: isThreshold ? surchargeComponents : [],
    }

    try {
      await upsert.mutateAsync(input)
      onOpenChange(false)
    } catch {
      /* erreur affichée via upsert.error */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!upsert.isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("pricing.fuelPolicy.title")}</DialogTitle>
          <DialogDescription>
            {t("pricing.fuelPolicy.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {upsert.isError && !hasFieldErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(upsert.error)}
              </AlertDescription>
            </Alert>
          )}

          <CheckboxField
            id="fuelEnabled"
            label={t("pricing.fuelPolicy.enabled")}
            checked={form.enabled}
            onCheckedChange={set("enabled")}
          />

          <div className="grid gap-x-4 sm:grid-cols-2">
            <SelectField
              id="fuelType"
              label={t("pricing.fuelPolicy.fuelType")}
              value={form.fuelType}
              onChange={(v) => set("fuelType")(v as FuelType)}
              options={fuelOptions}
              error={fieldErrors.fuelType}
            />
            <SelectField
              id="fuelMode"
              label={t("pricing.fuelPolicy.mode")}
              value={form.mode}
              onChange={(v) => set("mode")(v as FuelSurchargeMode)}
              options={modeOptions}
              error={fieldErrors.mode}
            />
          </div>

          {isThreshold ? (
            <FormField
              id="fuelThreshold"
              type="number"
              min={0}
              step="0.0001"
              label={t("pricing.fuelPolicy.thresholdPrice")}
              hint={t("pricing.fuelPolicy.thresholdHint")}
              value={form.thresholdPrice}
              onChange={(e) => set("thresholdPrice")(e.target.value)}
              error={fieldErrors.thresholdPrice}
              autoComplete="off"
            />
          ) : (
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="fuelReference"
                type="number"
                min={0}
                step="0.0001"
                label={t("pricing.fuelPolicy.referencePrice")}
                hint={t("pricing.fuelPolicy.referenceHint")}
                value={form.referencePrice}
                onChange={(e) => set("referencePrice")(e.target.value)}
                error={fieldErrors.referencePrice}
                autoComplete="off"
              />
              <FormField
                id="fuelDieselShare"
                type="number"
                min={0}
                max={1}
                step="0.0001"
                label={t("pricing.fuelPolicy.dieselShareRatio")}
                hint={t("pricing.fuelPolicy.dieselShareHint")}
                value={form.dieselShareRatio}
                onChange={(e) => set("dieselShareRatio")(e.target.value)}
                error={fieldErrors.dieselShareRatio}
                autoComplete="off"
              />
            </div>
          )}

          <FormField
            id="fuelSource"
            label={t("pricing.fuelPolicy.sourceFilter")}
            placeholder={t("pricing.fuelPolicy.sourcePlaceholder")}
            value={form.sourceFilter}
            onChange={(e) => set("sourceFilter")(e.target.value)}
            error={fieldErrors.sourceFilter}
            autoComplete="off"
          />

          <CheckboxField
            id="fuelClampAtZero"
            label={t("pricing.fuelPolicy.clampAtZero")}
            description={t("pricing.fuelPolicy.clampAtZeroHint")}
            checked={form.clampAtZero}
            onCheckedChange={set("clampAtZero")}
          />

          {isThreshold && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t("pricing.fuelPolicy.surchargeComponents")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("pricing.fuelPolicy.surchargeHint")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                >
                  <Plus />
                  {t("pricing.fuelPolicy.addSurcharge")}
                </Button>
              </div>

              {form.surchargeComponents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("pricing.fuelPolicy.noSurcharge")}
                </p>
              ) : (
                form.surchargeComponents.map((line, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-end gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0 grow basis-40">
                      <FormField
                        id={`surchargeLabel${index}`}
                        label={t("pricing.component.label")}
                        value={line.label}
                        onChange={(e) =>
                          updateLine(index, { label: e.target.value })
                        }
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                    <div className="w-36 shrink-0">
                      <SelectField
                        id={`surchargeBasis${index}`}
                        label={t("pricing.component.basis")}
                        value={line.basis}
                        onChange={(v) =>
                          updateLine(index, { basis: v as PricingBasis })
                        }
                        options={basisOptions}
                      />
                    </div>
                    <div className="w-28 shrink-0">
                      <FormField
                        id={`surchargePrice${index}`}
                        type="number"
                        min={0}
                        step="0.0001"
                        label={`${t("pricing.component.unitPrice")} (${t("common.taxExcluded")})`}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(index, { unitPrice: e.target.value })
                        }
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mb-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeLine(index)}
                      aria-label={t("common.cancel")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={upsert.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={upsert.isPending} disabled={!canSubmit}>
              {t("pricing.fuelPolicy.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
