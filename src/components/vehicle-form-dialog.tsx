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
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import {
  FUEL_TYPES,
  VEHICLE_TYPES,
  useCreateVehicle,
  useUpdateVehicle,
  type CreateVehicleInput,
  type FuelType,
  type VehicleResponse,
  type VehicleType,
} from "@/features/vehicles"

interface VehicleFormDialogProps {
  companyId: string
  open: boolean
  /** Véhicule à éditer ; `null` = mode création. */
  vehicle: VehicleResponse | null
  onOpenChange: (open: boolean) => void
  /** Appelé après une création réussie (ex. naviguer vers le détail). */
  onCreated?: (vehicle: VehicleResponse) => void
}

interface FormState {
  registrationPlate: string
  vehicleType: VehicleType
  vin: string
  make: string
  model: string
  version: string
  fuelType: string
  firstRegistrationDate: string
  emissionClass: string
  grossWeightKg: string
  payloadKg: string
  registrationCertificateNumber: string
  insurerName: string
  policyNumber: string
  coverageType: string
  insuranceStartDate: string
  insuranceEndDate: string
  insuranceContact: string
  technicalInspectionDate: string
  roadTaxDueDate: string
  notes: string
}

function emptyForm(): FormState {
  return {
    registrationPlate: "",
    vehicleType: "TRUCK",
    vin: "",
    make: "",
    model: "",
    version: "",
    fuelType: "",
    firstRegistrationDate: "",
    emissionClass: "",
    grossWeightKg: "",
    payloadKg: "",
    registrationCertificateNumber: "",
    insurerName: "",
    policyNumber: "",
    coverageType: "",
    insuranceStartDate: "",
    insuranceEndDate: "",
    insuranceContact: "",
    technicalInspectionDate: "",
    roadTaxDueDate: "",
    notes: "",
  }
}

function toFormState(vehicle: VehicleResponse): FormState {
  const ins = vehicle.insurance
  const num = (v: number | null) => (v === null ? "" : String(v))
  return {
    registrationPlate: vehicle.registrationPlate,
    vehicleType: vehicle.vehicleType,
    vin: vehicle.vin ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    version: vehicle.version ?? "",
    fuelType: vehicle.fuelType ?? "",
    firstRegistrationDate: vehicle.firstRegistrationDate ?? "",
    emissionClass: vehicle.emissionClass ?? "",
    grossWeightKg: num(vehicle.grossWeightKg),
    payloadKg: num(vehicle.payloadKg),
    registrationCertificateNumber: vehicle.registrationCertificateNumber ?? "",
    insurerName: ins?.insurerName ?? "",
    policyNumber: ins?.policyNumber ?? "",
    coverageType: ins?.coverageType ?? "",
    insuranceStartDate: ins?.startDate ?? "",
    insuranceEndDate: ins?.endDate ?? "",
    insuranceContact: ins?.contact ?? "",
    technicalInspectionDate: vehicle.technicalInspectionDate ?? "",
    roadTaxDueDate: vehicle.roadTaxDueDate ?? "",
    notes: vehicle.notes ?? "",
  }
}

/** "" → null, en supprimant les espaces superflus. */
function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

/** "" → null, sinon entier (ou null si non numérique). */
function ni(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number.parseInt(trimmed, 10)
  return Number.isNaN(n) ? null : n
}

export function VehicleFormDialog({
  companyId,
  open,
  vehicle,
  onOpenChange,
  onCreated,
}: VehicleFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = vehicle !== null
  const createVehicle = useCreateVehicle(companyId)
  const updateVehicle = useUpdateVehicle(companyId, vehicle?.id ?? "")
  const mutation = isEdit ? updateVehicle : createVehicle

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(vehicle ? toFormState(vehicle) : emptyForm())
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const isConflict =
    mutation.error instanceof ApiError && mutation.error.status === 409
  const plateError =
    fieldErrors.registrationPlate ??
    (isConflict ? getErrorMessage(mutation.error) ?? undefined : undefined)

  const typeOptions = VEHICLE_TYPES.map((value) => ({
    value,
    label: t(`vehicles.type.${value}`),
  }))
  const fuelOptions = FUEL_TYPES.map((value) => ({
    value,
    label: t(`vehicles.fuel.${value}`),
  }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const insurance = {
      insurerName: nz(form.insurerName),
      policyNumber: nz(form.policyNumber),
      coverageType: nz(form.coverageType),
      startDate: nz(form.insuranceStartDate),
      endDate: nz(form.insuranceEndDate),
      contact: nz(form.insuranceContact),
    }
    const hasInsurance = Object.values(insurance).some((v) => v !== null)

    // PATCH remplace entièrement le bloc assurance → on envoie le bloc complet.
    const input: CreateVehicleInput = {
      registrationPlate: form.registrationPlate.trim(),
      vehicleType: form.vehicleType,
      vin: nz(form.vin),
      make: nz(form.make),
      model: nz(form.model),
      version: nz(form.version),
      fuelType: (nz(form.fuelType) as FuelType | null) ?? null,
      firstRegistrationDate: nz(form.firstRegistrationDate),
      emissionClass: nz(form.emissionClass),
      grossWeightKg: ni(form.grossWeightKg),
      payloadKg: ni(form.payloadKg),
      registrationCertificateNumber: nz(form.registrationCertificateNumber),
      insurance: hasInsurance ? insurance : null,
      technicalInspectionDate: nz(form.technicalInspectionDate),
      roadTaxDueDate: nz(form.roadTaxDueDate),
      notes: nz(form.notes),
    }

    try {
      if (isEdit) {
        await updateVehicle.mutateAsync(input)
      } else {
        const created = await createVehicle.mutateAsync(input)
        onCreated?.(created)
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("vehicles.form.editTitle")
              : t("vehicles.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("vehicles.form.editDescription")
              : t("vehicles.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {mutation.isError && !hasFieldErrors && !isConflict && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.identification")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="vehiclePlate"
                label={t("vehicles.fields.registrationPlate")}
                placeholder={t("vehicles.form.platePlaceholder")}
                value={form.registrationPlate}
                onChange={(e) => set("registrationPlate")(e.target.value)}
                maxLength={16}
                error={plateError}
                autoComplete="off"
              />
              <SelectField
                id="vehicleType"
                label={t("vehicles.fields.vehicleType")}
                value={form.vehicleType}
                onChange={(v) => set("vehicleType")(v as VehicleType)}
                options={typeOptions}
                error={fieldErrors.vehicleType}
              />
              <FormField
                id="vehicleVin"
                label={t("vehicles.fields.vin")}
                placeholder={t("vehicles.form.vinPlaceholder")}
                value={form.vin}
                onChange={(e) => set("vin")(e.target.value)}
                maxLength={17}
                error={fieldErrors.vin}
                autoComplete="off"
              />
              <FormField
                id="vehicleMake"
                label={t("vehicles.fields.make")}
                placeholder={t("vehicles.form.makePlaceholder")}
                value={form.make}
                onChange={(e) => set("make")(e.target.value)}
                maxLength={64}
                error={fieldErrors.make}
                autoComplete="off"
              />
              <FormField
                id="vehicleModel"
                label={t("vehicles.fields.model")}
                placeholder={t("vehicles.form.modelPlaceholder")}
                value={form.model}
                onChange={(e) => set("model")(e.target.value)}
                maxLength={64}
                error={fieldErrors.model}
                autoComplete="off"
              />
            </div>
            <FormField
              id="vehicleVersion"
              label={t("vehicles.fields.version")}
              placeholder={t("vehicles.form.versionPlaceholder")}
              value={form.version}
              onChange={(e) => set("version")(e.target.value)}
              maxLength={128}
              error={fieldErrors.version}
              autoComplete="off"
            />
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.technical")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <SelectField
                id="vehicleFuel"
                label={t("vehicles.fields.fuelType")}
                value={form.fuelType}
                onChange={set("fuelType")}
                options={fuelOptions}
                placeholder={t("vehicles.form.none")}
                error={fieldErrors.fuelType}
              />
              <FormField
                id="vehicleFirstRegistration"
                type="date"
                label={t("vehicles.fields.firstRegistrationDate")}
                value={form.firstRegistrationDate}
                onChange={(e) => set("firstRegistrationDate")(e.target.value)}
                error={fieldErrors.firstRegistrationDate}
              />
              <FormField
                id="vehicleEmissionClass"
                label={t("vehicles.fields.emissionClass")}
                placeholder={t("vehicles.form.emissionClassPlaceholder")}
                value={form.emissionClass}
                onChange={(e) => set("emissionClass")(e.target.value)}
                maxLength={32}
                error={fieldErrors.emissionClass}
                autoComplete="off"
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.weights")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="vehicleGrossWeight"
                type="number"
                min={0}
                label={t("vehicles.fields.grossWeightKg")}
                value={form.grossWeightKg}
                onChange={(e) => set("grossWeightKg")(e.target.value)}
                error={fieldErrors.grossWeightKg}
                autoComplete="off"
              />
              <FormField
                id="vehiclePayload"
                type="number"
                min={0}
                label={t("vehicles.fields.payloadKg")}
                value={form.payloadKg}
                onChange={(e) => set("payloadKg")(e.target.value)}
                error={fieldErrors.payloadKg}
                autoComplete="off"
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.registration")}
            </h3>
            <FormField
              id="vehicleCertificate"
              label={t("vehicles.fields.registrationCertificateNumber")}
              placeholder={t("vehicles.form.certificatePlaceholder")}
              value={form.registrationCertificateNumber}
              onChange={(e) =>
                set("registrationCertificateNumber")(e.target.value)
              }
              maxLength={64}
              error={fieldErrors.registrationCertificateNumber}
              autoComplete="off"
            />
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.insurance")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="vehicleInsurer"
                label={t("vehicles.fields.insurerName")}
                placeholder={t("vehicles.form.insurerPlaceholder")}
                value={form.insurerName}
                onChange={(e) => set("insurerName")(e.target.value)}
                maxLength={200}
                error={fieldErrors["insurance.insurerName"]}
                autoComplete="off"
              />
              <FormField
                id="vehiclePolicyNumber"
                label={t("vehicles.fields.policyNumber")}
                value={form.policyNumber}
                onChange={(e) => set("policyNumber")(e.target.value)}
                maxLength={64}
                error={fieldErrors["insurance.policyNumber"]}
                autoComplete="off"
              />
              <FormField
                id="vehicleCoverageType"
                label={t("vehicles.fields.coverageType")}
                value={form.coverageType}
                onChange={(e) => set("coverageType")(e.target.value)}
                maxLength={64}
                error={fieldErrors["insurance.coverageType"]}
                autoComplete="off"
              />
              <FormField
                id="vehicleInsuranceContact"
                label={t("vehicles.fields.insuranceContact")}
                value={form.insuranceContact}
                onChange={(e) => set("insuranceContact")(e.target.value)}
                maxLength={200}
                error={fieldErrors["insurance.contact"]}
                autoComplete="off"
              />
              <FormField
                id="vehicleInsuranceStart"
                type="date"
                label={t("vehicles.fields.insuranceStartDate")}
                value={form.insuranceStartDate}
                onChange={(e) => set("insuranceStartDate")(e.target.value)}
                error={fieldErrors["insurance.startDate"]}
              />
              <FormField
                id="vehicleInsuranceEnd"
                type="date"
                label={t("vehicles.fields.insuranceEndDate")}
                value={form.insuranceEndDate}
                onChange={(e) => set("insuranceEndDate")(e.target.value)}
                error={fieldErrors["insurance.endDate"]}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.regulatory")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="vehicleTechnicalInspection"
                type="date"
                label={t("vehicles.fields.technicalInspectionDate")}
                value={form.technicalInspectionDate}
                onChange={(e) => set("technicalInspectionDate")(e.target.value)}
                error={fieldErrors.technicalInspectionDate}
              />
              <FormField
                id="vehicleRoadTax"
                type="date"
                label={t("vehicles.fields.roadTaxDueDate")}
                value={form.roadTaxDueDate}
                onChange={(e) => set("roadTaxDueDate")(e.target.value)}
                error={fieldErrors.roadTaxDueDate}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-sm font-medium text-foreground">
              {t("vehicles.form.notes")}
            </h3>
            <TextareaField
              id="vehicleNotes"
              label={t("vehicles.fields.notes")}
              placeholder={t("vehicles.form.notesPlaceholder")}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              error={fieldErrors.notes}
              rows={3}
            />
          </section>

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
              disabled={!form.registrationPlate.trim()}
            >
              {isEdit ? t("common.save") : t("vehicles.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
