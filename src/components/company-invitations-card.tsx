import { useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Check, Copy, Mail, Trash2 } from "lucide-react"
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
import { FormField } from "@/components/form-field"
import { formatDate } from "@/lib/date"
import { ApiError } from "@/lib/http"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  useCompanyInvitations,
  useCreateInvitation,
  useDeleteInvitation,
  type InvitationResponse,
  type InvitationStatus,
} from "@/features/invitations"

const STATUS_STYLES: Record<InvitationStatus, string> = {
  PENDING: "bg-[var(--status-collected-bg)] text-[var(--status-collected-text)]",
  ACCEPTED: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
  EXPIRED: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  REVOKED: "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]",
}

interface CompanyInvitationsCardProps {
  companyId: string
  canManage: boolean
}

export function CompanyInvitationsCard({
  companyId,
  canManage,
}: CompanyInvitationsCardProps) {
  const { t } = useTranslation()
  const invitations = useCompanyInvitations(companyId)
  const createInvitation = useCreateInvitation(companyId)
  const deleteInvitation = useDeleteInvitation(companyId)
  const [email, setEmail] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<InvitationResponse | null>(null)

  const fieldErrors = getFieldErrors(createInvitation.error)

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    try {
      await createInvitation.mutateAsync({ email: email.trim() })
      setEmail("")
    } catch {
      /* erreur affichée via createInvitation.error */
    }
  }

  const handleCopy = async (link: string, id: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      /* presse-papiers indisponible */
    }
  }

  const askDelete = (invitation: InvitationResponse) => {
    deleteInvitation.reset()
    setToDelete(invitation)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteInvitation.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch (error) {
      // Déjà supprimée ailleurs : la liste se resynchronise, on ferme.
      if (error instanceof ApiError && error.status === 404) setToDelete(null)
      // Sinon (403, etc.) : l'erreur reste affichée dans le dialog.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("company.invitations.title")}
        </CardTitle>
        <CardDescription>
          {t("company.invitations.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleInvite} className="grid max-w-md gap-3">
          {createInvitation.isError && !Object.keys(fieldErrors).length && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(createInvitation.error)}
              </AlertDescription>
            </Alert>
          )}
          <FormField
            id="inviteEmail"
            type="email"
            label={t("company.invitations.email")}
            placeholder={t("common.placeholders.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            autoComplete="off"
          />
          <div>
            <Button
              type="submit"
              disabled={createInvitation.isPending || !email.trim()}
            >
              <Mail />
              {t("company.invitations.invite")}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          {invitations.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(invitations.error)}
              </AlertDescription>
            </Alert>
          )}

          {invitations.isLoading && (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          )}

          {invitations.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("company.invitations.empty")}
            </p>
          )}

          {invitations.data?.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-wrap items-center gap-3 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {invitation.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("company.invitations.expiresAt", {
                    date: formatDate(invitation.expiresAt),
                  })}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[invitation.status]}`}
              >
                {t(`company.invitations.status.${invitation.status}`)}
              </span>
              {invitation.joinLink && invitation.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(invitation.joinLink!, invitation.id)
                  }
                >
                  {copied === invitation.id ? <Check /> : <Copy />}
                  {copied === invitation.id
                    ? t("company.invitations.copied")
                    : t("company.invitations.copyLink")}
                </Button>
              )}
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => askDelete(invitation)}
                  aria-label={t("company.invitations.delete")}
                >
                  <Trash2 />
                  {t("company.invitations.delete")}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteInvitation.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("company.invitations.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("company.invitations.deleteBody", {
                email: toDelete?.email ?? "",
              })}
            </DialogDescription>
          </DialogHeader>

          {toDelete?.status === "ACCEPTED" && (
            <Alert>
              <AlertDescription>
                {t("company.invitations.deleteAcceptedNote")}
              </AlertDescription>
            </Alert>
          )}

          {deleteInvitation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteInvitation.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteInvitation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteInvitation.isPending}
              onClick={confirmDelete}
            >
              {t("company.invitations.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
