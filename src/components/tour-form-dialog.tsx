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
import { TextareaField } from "@/components/textarea-field"
import { VehicleSelect, AssigneeSelect } from "@/components/transport-selects"
import { AddressFields } from "@/components/address-fields"
import {
  addressFieldsFromDto,
  addressFieldsToDto,
  emptyAddressFields,
  type AddressFieldsValue,
} from "@/lib/address-fields"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import {
  useCreateTour,
  useUpdateTour,
  type CreateTourRequest,
  type TourResponse,
  type UpdateTourRequest,
} from "@/features/tours"

interface TourFormDialogProps {
  companyId: string
  open: boolean
  /** Tournée à éditer ; `null` = création. */
  tour: TourResponse | null
  onOpenChange: (open: boolean) => void
  onSaved?: (tour: TourResponse) => void
}

interface FormState {
  reference: string
  name: string
  plannedDate: string
  depot: AddressFieldsValue
  vehicleId: string
  assignedAccountId: string
  notes: string
}

function emptyForm(): FormState {
  return {
    reference: "",
    name: "",
    plannedDate: "",
    depot: emptyAddressFields(),
    vehicleId: "",
    assignedAccountId: "",
    notes: "",
  }
}

function toFormState(tour: TourResponse): FormState {
  return {
    reference: tour.reference ?? "",
    name: tour.name,
    plannedDate: tour.plannedDate ?? "",
    depot: addressFieldsFromDto(tour.depot, tour.depotLocation),
    vehicleId: tour.vehicleId ?? "",
    assignedAccountId: tour.assignedAccountId ?? "",
    notes: tour.notes ?? "",
  }
}

function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function TourFormDialog({
  companyId,
  open,
  tour,
  onOpenChange,
  onSaved,
}: TourFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = tour !== null
  const createTour = useCreateTour(companyId)
  const updateTour = useUpdateTour(companyId, tour?.id ?? "")
  const mutation = isEdit ? updateTour : createTour

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(tour ? toFormState(tour) : emptyForm())
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tour])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const isConflict =
    mutation.error instanceof ApiError && mutation.error.status === 409
  const referenceError =
    fieldErrors.reference ??
    (isConflict ? (getErrorMessage(mutation.error) ?? undefined) : undefined)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return

    const { address, location } = addressFieldsToDto(form.depot)

    try {
      if (isEdit) {
        const input: UpdateTourRequest = {
          name,
          plannedDate: nz(form.plannedDate),
          depot: address,
          depotLocation: location,
          notes: nz(form.notes),
        }
        await updateTour.mutateAsync(input)
        onOpenChange(false)
      } else {
        const input: CreateTourRequest = {
          reference: nz(form.reference),
          name,
          plannedDate: nz(form.plannedDate),
          depot: address,
          depotLocation: location,
          vehicleId: nz(form.vehicleId),
          assignedAccountId: nz(form.assignedAccountId),
          notes: nz(form.notes),
        }
        const created = await createTour.mutateAsync(input)
        onSaved?.(created)
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("tours.form.editTitle") : t("tours.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("tours.form.editDescription")
              : t("tours.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mutation.isError && !hasFieldErrors && !isConflict && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="tourName"
              label={t("tours.fields.name")}
              placeholder={t("tours.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              error={fieldErrors.name}
              autoComplete="off"
            />
            {!isEdit && (
              <FormField
                id="tourReference"
                label={t("tours.fields.reference")}
                placeholder={t("tours.form.referencePlaceholder")}
                value={form.reference}
                onChange={(e) => set("reference")(e.target.value)}
                error={referenceError}
                autoComplete="off"
              />
            )}
            <FormField
              id="tourPlannedDate"
              type="date"
              label={t("tours.fields.plannedDate")}
              value={form.plannedDate}
              onChange={(e) => set("plannedDate")(e.target.value)}
              error={fieldErrors.plannedDate}
              autoComplete="off"
            />
          </div>

          {!isEdit && (
            <div className="grid gap-x-4 sm:grid-cols-2">
              <VehicleSelect
                companyId={companyId}
                id="tourVehicle"
                label={t("tours.fields.vehicle")}
                value={form.vehicleId}
                onChange={set("vehicleId")}
                error={fieldErrors.vehicleId}
              />
              <AssigneeSelect
                companyId={companyId}
                id="tourProfile"
                label={t("tours.fields.driver")}
                value={form.assignedAccountId}
                onChange={set("assignedAccountId")}
                error={fieldErrors.assignedAccountId}
              />
            </div>
          )}

          <div className="grid gap-3 rounded-lg border p-4">
            <h3 className="text-sm font-medium text-foreground">
              {t("tours.fields.depot")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("tours.form.depotHint")}
            </p>
            <AddressFields
              idPrefix="depot"
              value={form.depot}
              onChange={set("depot")}
              errorPrefix="depot"
              fieldErrors={fieldErrors}
            />
          </div>

          <TextareaField
            id="tourNotes"
            label={t("tours.fields.notes")}
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            rows={2}
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
              {isEdit ? t("common.save") : t("tours.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
