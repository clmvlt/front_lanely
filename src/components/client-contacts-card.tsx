import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Pencil, Plus, Trash2, User } from "lucide-react"
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
import { ClientContactFormDialog } from "@/components/client-contact-form-dialog"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { useDeleteContact, type ClientContactResponse } from "@/features/clients"

interface ClientContactsCardProps {
  companyId: string
  clientId: string
  contacts: ClientContactResponse[]
  canManage: boolean
}

function contactName(contact: ClientContactResponse, fallback: string): string {
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ")
  return name.trim() || contact.email || fallback
}

export function ClientContactsCard({
  companyId,
  clientId,
  contacts,
  canManage,
}: ClientContactsCardProps) {
  const { t } = useTranslation()
  const deleteContact = useDeleteContact(companyId, clientId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClientContactResponse | null>(null)
  const [toDelete, setToDelete] = useState<ClientContactResponse | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (contact: ClientContactResponse) => {
    setEditing(contact)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteContact.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">
            {t("clients.contacts.title")}
          </CardTitle>
          <CardDescription>
            {t("clients.contacts.description")}
          </CardDescription>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            className="shrink-0"
          >
            <Plus />
            {t("clients.contacts.create")}
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("clients.contacts.empty")}
          </p>
        )}

        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex flex-wrap items-start gap-3 rounded-md border p-3"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <User className="size-4" />
            </span>
            <div className="min-w-0 grow basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {contactName(contact, t("clients.contacts.unnamed"))}
                </p>
                {!contact.active && (
                  <span className="rounded-full bg-[var(--status-pending-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-pending-text)]">
                    {t("clients.contacts.inactive")}
                  </span>
                )}
              </div>
              {contact.jobTitle && (
                <p className="truncate text-xs text-muted-foreground">
                  {contact.jobTitle}
                </p>
              )}
              {(contact.email || contact.phone) && (
                <p className="truncate text-xs text-muted-foreground">
                  {[contact.email, contact.phone].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {contact.isPrimary && (
                  <span className="rounded-full bg-[var(--status-delivered-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-delivered-text)]">
                    {t("clients.contacts.badgePrimary")}
                  </span>
                )}
                {contact.receivesInvoices && (
                  <span className="rounded-full bg-[var(--status-collected-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-collected-text)]">
                    {t("clients.contacts.badgeInvoices")}
                  </span>
                )}
                {contact.receivesDeliveryNotifications && (
                  <span className="rounded-full bg-[var(--status-transit-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-transit-text)]">
                    {t("clients.contacts.badgeDeliveries")}
                  </span>
                )}
              </div>
            </div>

            {canManage && (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(contact)}
                  aria-label={t("common.save")}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    deleteContact.reset()
                    setToDelete(contact)
                  }}
                  aria-label={t("clients.contacts.delete")}
                >
                  <Trash2 />
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <ClientContactFormDialog
        companyId={companyId}
        clientId={clientId}
        open={formOpen}
        contact={editing}
        onOpenChange={setFormOpen}
      />

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteContact.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.contacts.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("clients.contacts.deleteBody", {
                name: toDelete
                  ? contactName(toDelete, t("clients.contacts.unnamed"))
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>

          {deleteContact.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteContact.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteContact.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteContact.isPending}
              onClick={confirmDelete}
            >
              {t("clients.contacts.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
