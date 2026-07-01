import { useRef, useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Camera, Trash2 } from "lucide-react"
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
import { SessionsCard } from "@/components/sessions-card"
import { imageUrl } from "@/lib/images"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { useAuth } from "@/app/auth-context"
import {
  useChangePassword,
  useDeleteProfilePicture,
  useUpdateMe,
  useUpdateProfilePicture,
} from "@/features/auth"

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const updateMe = useUpdateMe()
  const changePassword = useChangePassword()
  const updatePicture = useUpdateProfilePicture()
  const deletePicture = useDeleteProfilePicture()

  const fileInput = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [infoSaved, setInfoSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordChanged, setPasswordChanged] = useState(false)

  if (!user) return null

  const avatar = imageUrl(user.profileImageUrl)
  const infoFieldErrors = getFieldErrors(updateMe.error)
  const passwordFieldErrors = getFieldErrors(changePassword.error)
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword

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

  const handleSaveInfo = async (event: React.FormEvent) => {
    event.preventDefault()
    setInfoSaved(false)
    try {
      await updateMe.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setInfoSaved(true)
    } catch {
      /* erreur affichée via updateMe.error */
    }
  }

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordChanged(false)
    if (passwordMismatch) return
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      setPasswordChanged(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      /* erreur affichée via changePassword.error */
    }
  }

  const pictureBusy = updatePicture.isPending || deletePicture.isPending
  const pictureError = getErrorMessage(updatePicture.error ?? deletePicture.error)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {t("profile.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile.picture.title")}</CardTitle>
          <CardDescription>{t("profile.picture.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-foreground">
                {initials(user.firstName, user.lastName)}
              </span>
            )}

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
                  ? t("profile.picture.uploading")
                  : t("profile.picture.change")}
              </Button>
              {avatar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePicture}
                  disabled={pictureBusy}
                >
                  <Trash2 />
                  {t("profile.picture.remove")}
                </Button>
              )}
            </div>
          </div>

          {pictureError && (
            <Alert variant="destructive">
              <AlertDescription>{pictureError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile.info.title")}</CardTitle>
          <CardDescription>{t("profile.info.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveInfo} className="grid max-w-md gap-3">
            {updateMe.isError && !Object.keys(infoFieldErrors).length && (
              <Alert variant="destructive">
                <AlertDescription>{getErrorMessage(updateMe.error)}</AlertDescription>
              </Alert>
            )}
            {infoSaved && (
              <Alert>
                <AlertDescription>{t("profile.info.saved")}</AlertDescription>
              </Alert>
            )}
            <FormField
              id="firstName"
              label={t("common.firstName")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={infoFieldErrors.firstName}
              autoComplete="given-name"
            />
            <FormField
              id="lastName"
              label={t("common.lastName")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={infoFieldErrors.lastName}
              autoComplete="family-name"
            />
            <FormField
              id="email"
              label={t("common.email")}
              value={user.email}
              hint={t("profile.info.emailHint")}
              disabled
              readOnly
              autoComplete="email"
            />
            <div>
              <Button
                type="submit"
                disabled={
                  updateMe.isPending || !firstName.trim() || !lastName.trim()
                }
              >
                {t("profile.info.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profile.password.title")}</CardTitle>
          <CardDescription>{t("profile.password.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid max-w-md gap-3">
            {changePassword.isError &&
              !Object.keys(passwordFieldErrors).length && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {getErrorMessage(changePassword.error)}
                  </AlertDescription>
                </Alert>
              )}
            {passwordChanged && (
              <Alert>
                <AlertDescription>{t("profile.password.changed")}</AlertDescription>
              </Alert>
            )}
            <FormField
              id="currentPassword"
              type="password"
              label={t("profile.password.current")}
              placeholder={t("common.placeholders.password")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={passwordFieldErrors.currentPassword}
              autoComplete="current-password"
            />
            <FormField
              id="newPassword"
              type="password"
              label={t("profile.password.new")}
              placeholder={t("common.placeholders.password")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordFieldErrors.newPassword}
              hint={t("auth.passwordHint")}
              autoComplete="new-password"
            />
            <FormField
              id="confirmPassword"
              type="password"
              label={t("profile.password.confirm")}
              placeholder={t("common.placeholders.password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={passwordMismatch ? t("auth.passwordMismatch") : undefined}
              autoComplete="new-password"
            />
            <div>
              <Button
                type="submit"
                disabled={
                  changePassword.isPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  passwordMismatch
                }
              >
                {t("profile.password.save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SessionsCard />
    </div>
  )
}
