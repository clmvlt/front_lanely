import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Power, Smartphone, Trash2, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { ProfileFormDialog } from "@/components/profile-form-dialog"
import { ApiError } from "@/lib/http"
import { getErrorMessage } from "@/lib/api-error"
import {
  useCompanyProfiles,
  useDeleteProfile,
  useSetProfileActive,
  type DeliveryProfile,
} from "@/features/profiles"
import { useCompanySeats } from "@/features/subscriptions"

interface CompanyProfilesCardProps {
  companyId: string
  canManage: boolean
}

export function CompanyProfilesCard({
  companyId,
  canManage,
}: CompanyProfilesCardProps) {
  const { t } = useTranslation()
  const profiles = useCompanyProfiles(companyId)
  const seats = useCompanySeats(companyId)
  const setActive = useSetProfileActive(companyId)
  const deleteProfile = useDeleteProfile(companyId)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DeliveryProfile | null>(null)
  const [toDelete, setToDelete] = useState<DeliveryProfile | null>(null)

  const usage = seats.data
  const hasPlan = (usage?.seatsLimit ?? 0) > 0
  const seatsRemaining = usage?.seatsRemaining ?? 0
  const isFull = hasPlan && seatsRemaining <= 0
  const pct = hasPlan
    ? Math.min(100, Math.round(((usage?.seatsUsed ?? 0) / usage!.seatsLimit) * 100))
    : 0
  const canCreate = canManage && hasPlan && !isFull

  const askDelete = (profile: DeliveryProfile) => {
    deleteProfile.reset()
    setToDelete(profile)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteProfile.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch (error) {
      // Déjà supprimé ailleurs : la liste se resynchronise, on ferme.
      if (error instanceof ApiError && error.status === 404) setToDelete(null)
      // Sinon (403, etc.) : l'erreur reste affichée dans le dialog.
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle className="text-base">
            {t("company.profiles.title")}
          </CardTitle>
          <CardDescription>
            {t("company.profiles.description")}
          </CardDescription>
        </div>
        {canManage && (
          <Button
            size="sm"
            disabled={!canCreate}
            onClick={() => setCreating(true)}
          >
            <Plus />
            {t("company.profiles.create")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {usage && (
          <div className="flex flex-col gap-2 rounded-md border bg-accent/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                {t("company.profiles.seats.usage", {
                  used: usage.seatsUsed,
                  limit: usage.seatsLimit,
                })}
              </span>
              {hasPlan && (
                <span className="text-xs font-medium text-muted-foreground">
                  {t("company.profiles.seats.remaining", {
                    count: seatsRemaining,
                  })}
                </span>
              )}
            </div>
            {hasPlan && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className={
                    isFull
                      ? "h-full rounded-full bg-[var(--status-failed)]"
                      : "h-full rounded-full bg-primary"
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            {(isFull || !hasPlan) && (
              <p className="text-xs text-muted-foreground">
                {hasPlan
                  ? t("company.profiles.seats.full")
                  : t("company.profiles.seats.noPlan")}{" "}
                <Link
                  to="/app/subscription"
                  className="font-medium text-[var(--color-text-brand)] underline-offset-2 hover:underline"
                >
                  {t("company.profiles.seats.manage")}
                </Link>
              </p>
            )}
          </div>
        )}

        {profiles.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(profiles.error)}
            </AlertDescription>
          </Alert>
        )}

        {profiles.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {profiles.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("company.profiles.empty")}
          </p>
        )}

        {profiles.data?.map((profile) => (
          <div
            key={profile.id}
            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Smartphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {profile.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{profile.username}
              </p>
            </div>
            <span
              className={
                profile.active
                  ? "rounded-full bg-[var(--status-delivered-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-delivered-text)]"
                  : "rounded-full bg-[var(--status-failed-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-failed-text)]"
              }
            >
              {profile.active
                ? t("company.profiles.active")
                : t("company.profiles.inactive")}
            </span>
            {canManage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(profile)}
                >
                  <Pencil />
                  {t("company.profiles.edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    setActive.isPending &&
                    setActive.variables?.profileId === profile.id
                  }
                  onClick={() =>
                    setActive.mutate({
                      profileId: profile.id,
                      active: !profile.active,
                    })
                  }
                >
                  <Power />
                  {profile.active
                    ? t("company.profiles.deactivate")
                    : t("company.profiles.activate")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => askDelete(profile)}
                  aria-label={t("company.profiles.delete")}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </div>
        ))}

        {setActive.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(setActive.error)}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <ProfileFormDialog
        companyId={companyId}
        open={creating || editing !== null}
        profile={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteProfile.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("company.profiles.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("company.profiles.deleteBody", {
                name: toDelete?.displayName ?? "",
              })}
            </DialogDescription>
          </DialogHeader>

          {deleteProfile.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteProfile.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteProfile.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteProfile.isPending}
              onClick={confirmDelete}
            >
              {t("company.profiles.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
