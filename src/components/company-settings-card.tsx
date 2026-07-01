import { useRef, useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Building2, Camera, Trash2 } from "lucide-react"
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
import { imageUrl } from "@/lib/images"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import type { CompanyMembership } from "@/features/auth"
import {
  useCompanyDetail,
  useDeleteCompanyPicture,
  useUpdateCompany,
  useUpdateCompanyPicture,
} from "@/features/companies"
import { toUpdateCompanyInput } from "@/features/companies"

interface CompanySettingsCardProps {
  company: CompanyMembership
  canManage: boolean
}

export function CompanySettingsCard({
  company,
  canManage,
}: CompanySettingsCardProps) {
  const { t } = useTranslation()
  const detailQuery = useCompanyDetail(company.companyId)
  const updateCompany = useUpdateCompany(company.companyId)
  const updatePicture = useUpdateCompanyPicture(company.companyId)
  const deletePicture = useDeleteCompanyPicture(company.companyId)

  const fileInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(company.companyName)
  const [saved, setSaved] = useState(false)

  const logo = imageUrl(company.profileImageUrl)
  const fieldErrors = getFieldErrors(updateCompany.error)
  const pictureBusy = updatePicture.isPending || deletePicture.isPending
  const pictureError = getErrorMessage(updatePicture.error ?? deletePicture.error)

  const handlePickFile = () => fileInput.current?.click()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      await updatePicture.mutateAsync(file)
    } catch {
      /* erreur affichée via updatePicture.error */
    }
  }

  const handleRemovePicture = async () => {
    try {
      await deletePicture.mutateAsync()
    } catch {
      /* erreur affichée via deletePicture.error */
    }
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!detailQuery.data) return
    setSaved(false)
    try {
      // PATCH = remplacement complet : repartir de l'état courant (infos
      // légales/facturation incluses) pour ne modifier que le nom.
      await updateCompany.mutateAsync({
        ...toUpdateCompanyInput(detailQuery.data),
        name: name.trim(),
      })
      setSaved(true)
    } catch {
      /* erreur affichée via updateCompany.error */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4 text-muted-foreground" />
          {t("company.settings.title")}
        </CardTitle>
        <CardDescription>{t("company.settings.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="size-16 rounded-md object-cover"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-md bg-accent text-lg font-semibold text-accent-foreground">
              {company.companyName.charAt(0).toUpperCase()}
            </span>
          )}

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePickFile}
                disabled={pictureBusy}
              >
                <Camera />
                {updatePicture.isPending
                  ? t("company.settings.uploading")
                  : t("company.settings.changePicture")}
              </Button>
              {logo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePicture}
                  disabled={pictureBusy}
                >
                  <Trash2 />
                  {t("company.settings.removePicture")}
                </Button>
              )}
            </div>
          )}
        </div>

        {pictureError && (
          <Alert variant="destructive">
            <AlertDescription>{pictureError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSave} className="grid max-w-md gap-3">
          {updateCompany.isError && !Object.keys(fieldErrors).length && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(updateCompany.error)}
              </AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>{t("company.settings.saved")}</AlertDescription>
            </Alert>
          )}
          <FormField
            id="companyName"
            label={t("company.settings.name")}
            value={canManage ? name : company.companyName}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            disabled={!canManage}
            readOnly={!canManage}
          />
          <FormField
            id="publicCode"
            label={t("company.settings.publicCode")}
            value={company.publicCode}
            hint={t("company.settings.publicCodeHint")}
            disabled
            readOnly
          />
          {canManage && (
            <div>
              <Button
                type="submit"
                disabled={
                  updateCompany.isPending ||
                  !detailQuery.data ||
                  !name.trim() ||
                  name.trim() === company.companyName
                }
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
