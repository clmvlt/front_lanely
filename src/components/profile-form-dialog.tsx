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
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  useCreateProfile,
  useUpdateProfile,
  type DeliveryProfile,
  type UpdateProfileInput,
} from "@/features/profiles"

interface ProfileFormDialogProps {
  companyId: string
  open: boolean
  /** Profil à éditer ; `null` = mode création. */
  profile: DeliveryProfile | null
  onOpenChange: (open: boolean) => void
}

export function ProfileFormDialog({
  companyId,
  open,
  profile,
  onOpenChange,
}: ProfileFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = profile !== null
  const createProfile = useCreateProfile(companyId)
  const updateProfile = useUpdateProfile(companyId, profile?.id ?? "")
  const mutation = isEdit ? updateProfile : createProfile

  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    if (!open) return
    setUsername(profile?.username ?? "")
    setDisplayName(profile?.displayName ?? "")
    setPassword("")
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile])

  const fieldErrors = getFieldErrors(mutation.error)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      if (isEdit) {
        const input: UpdateProfileInput = {
          username: username.trim(),
          displayName: displayName.trim(),
        }
        if (password) input.password = password
        await updateProfile.mutateAsync(input)
      } else {
        await createProfile.mutateAsync({
          username: username.trim(),
          displayName: displayName.trim(),
          password,
        })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("company.profiles.editTitle")
              : t("company.profiles.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("company.profiles.editDescription")
              : t("company.profiles.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          {mutation.isError && !Object.keys(fieldErrors).length && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <FormField
            id="profileDisplayName"
            label={t("company.profiles.displayName")}
            placeholder={t("company.profiles.displayNamePlaceholder")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={fieldErrors.displayName}
            autoComplete="off"
          />
          <FormField
            id="profileUsername"
            label={t("company.profiles.username")}
            placeholder={t("company.profiles.usernamePlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
            autoComplete="off"
          />
          <FormField
            id="profilePassword"
            type="password"
            label={t("company.profiles.password")}
            placeholder={t("common.placeholders.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint={isEdit ? t("company.profiles.passwordEditHint") : undefined}
            autoComplete="new-password"
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
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? t("common.save") : t("company.profiles.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
