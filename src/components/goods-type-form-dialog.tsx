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
import { CheckboxField } from "@/components/checkbox-field"
import { ApiError } from "@/lib/http"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  useCreateGoodsType,
  useUpdateGoodsType,
  type CreateGoodsTypeRequest,
  type GoodsTypeResponse,
  type UpdateGoodsTypeRequest,
} from "@/features/goods-types"

interface GoodsTypeFormState {
  name: string
  description: string
  packagingType: string
  numberOfPackages: string
  grossWeightKg: string
  volumeM3: string
  lengthCm: string
  widthCm: string
  heightCm: string
  dangerousGoods: boolean
  unNumber: string
}

function emptyForm(): GoodsTypeFormState {
  return {
    name: "",
    description: "",
    packagingType: "",
    numberOfPackages: "",
    grossWeightKg: "",
    volumeM3: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    dangerousGoods: false,
    unNumber: "",
  }
}

function toFormState(type: GoodsTypeResponse): GoodsTypeFormState {
  const num = (v: number | null | undefined) => (v != null ? String(v) : "")
  return {
    name: type.name ?? "",
    description: type.description ?? "",
    packagingType: type.packagingType ?? "",
    numberOfPackages: num(type.numberOfPackages),
    grossWeightKg: num(type.grossWeightKg),
    volumeM3: num(type.volumeM3),
    lengthCm: num(type.lengthCm),
    widthCm: num(type.widthCm),
    heightCm: num(type.heightCm),
    dangerousGoods: type.dangerousGoods,
    unNumber: type.unNumber ?? "",
  }
}

/**
 * Construit le corps de requête. À l'édition (PATCH), un champ vidé est envoyé
 * en chaîne vide `""` (normalisée en null par l'API) pour réellement effacer la
 * valeur ; à la création, les champs vides sont simplement omis.
 */
function buildBody(form: GoodsTypeFormState, isEdit: boolean) {
  const str = (v: string): string | undefined => {
    const trimmed = v.trim()
    if (trimmed) return trimmed
    return isEdit ? "" : undefined
  }
  const num = (v: string): number | string | undefined => {
    const trimmed = v.trim()
    if (trimmed === "") return isEdit ? "" : undefined
    const parsed = Number.parseFloat(trimmed)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return {
    name: form.name.trim(),
    description: str(form.description),
    packagingType: str(form.packagingType),
    numberOfPackages: num(form.numberOfPackages),
    grossWeightKg: num(form.grossWeightKg),
    volumeM3: num(form.volumeM3),
    lengthCm: num(form.lengthCm),
    widthCm: num(form.widthCm),
    heightCm: num(form.heightCm),
    dangerousGoods: form.dangerousGoods,
    unNumber: form.dangerousGoods ? str(form.unNumber) : isEdit ? "" : undefined,
  }
}

interface GoodsTypeFormDialogProps {
  companyId: string
  open: boolean
  /** Type à éditer ; `null` = création. */
  goodsType: GoodsTypeResponse | null
  onOpenChange: (open: boolean) => void
}

export function GoodsTypeFormDialog({
  companyId,
  open,
  goodsType,
  onOpenChange,
}: GoodsTypeFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = goodsType !== null
  const createType = useCreateGoodsType(companyId)
  const updateType = useUpdateGoodsType(companyId, goodsType?.id ?? "")
  const mutation = isEdit ? updateType : createType

  const [form, setForm] = useState<GoodsTypeFormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(goodsType ? toFormState(goodsType) : emptyForm())
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goodsType])

  const patch = (partial: Partial<GoodsTypeFormState>) =>
    setForm((prev) => ({ ...prev, ...partial }))

  const fieldErrors = getFieldErrors(mutation.error)
  const isConflict =
    mutation.error instanceof ApiError && mutation.error.status === 409
  const nameError =
    fieldErrors.name ??
    (isConflict ? (getErrorMessage(mutation.error) ?? undefined) : undefined)
  const otherError =
    mutation.isError && !isConflict && Object.keys(fieldErrors).length === 0
      ? getErrorMessage(mutation.error)
      : null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    const body = buildBody(form, isEdit)
    try {
      if (isEdit) {
        await updateType.mutateAsync(body as UpdateGoodsTypeRequest)
      } else {
        await createType.mutateAsync(body as CreateGoodsTypeRequest)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("goodsTypes.form.editTitle")
              : t("goodsTypes.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("goodsTypes.form.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-2">
          {otherError && (
            <Alert variant="destructive">
              <AlertDescription>{otherError}</AlertDescription>
            </Alert>
          )}

          <FormField
            id="goodsTypeName"
            label={t("goodsTypes.fields.name")}
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            error={nameError}
            autoComplete="off"
            autoFocus
          />
          <TextareaField
            id="goodsTypeDescription"
            label={t("goodsTypes.fields.description")}
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={2}
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="goodsTypePackaging"
              label={t("waybills.goods.packagingType")}
              value={form.packagingType}
              onChange={(e) => patch({ packagingType: e.target.value })}
              autoComplete="off"
            />
            <FormField
              id="goodsTypePackages"
              type="number"
              min={0}
              label={t("waybills.goods.numberOfPackages")}
              value={form.numberOfPackages}
              onChange={(e) => patch({ numberOfPackages: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="goodsTypeWeight"
              type="number"
              step="any"
              min={0}
              label={t("waybills.goods.grossWeightKg")}
              value={form.grossWeightKg}
              onChange={(e) => patch({ grossWeightKg: e.target.value })}
              autoComplete="off"
            />
            <FormField
              id="goodsTypeVolume"
              type="number"
              step="any"
              min={0}
              label={t("waybills.goods.volumeM3")}
              value={form.volumeM3}
              onChange={(e) => patch({ volumeM3: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <FormField
              id="goodsTypeLength"
              type="number"
              step="any"
              min={0}
              label={t("waybills.goods.lengthCm")}
              value={form.lengthCm}
              onChange={(e) => patch({ lengthCm: e.target.value })}
              autoComplete="off"
            />
            <FormField
              id="goodsTypeWidth"
              type="number"
              step="any"
              min={0}
              label={t("waybills.goods.widthCm")}
              value={form.widthCm}
              onChange={(e) => patch({ widthCm: e.target.value })}
              autoComplete="off"
            />
            <FormField
              id="goodsTypeHeight"
              type="number"
              step="any"
              min={0}
              label={t("waybills.goods.heightCm")}
              value={form.heightCm}
              onChange={(e) => patch({ heightCm: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <CheckboxField
              id="goodsTypeDangerous"
              label={t("waybills.goods.dangerousGoods")}
              checked={form.dangerousGoods}
              onCheckedChange={(dangerousGoods) => patch({ dangerousGoods })}
            />
            {form.dangerousGoods && (
              <div className="min-w-0 flex-1 basis-40">
                <FormField
                  id="goodsTypeUn"
                  label={t("waybills.goods.unNumber")}
                  value={form.unNumber}
                  onChange={(e) => patch({ unNumber: e.target.value })}
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
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
              {isEdit ? t("common.save") : t("goodsTypes.form.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
