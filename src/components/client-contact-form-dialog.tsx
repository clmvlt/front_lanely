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
import { CheckboxField } from "@/components/checkbox-field"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import {
  useCreateContact,
  useUpdateContact,
  type ClientContactResponse,
  type CreateClientContactInput,
  type UpdateClientContactInput,
} from "@/features/clients"

interface ClientContactFormDialogProps {
  companyId: string
  clientId: string
  open: boolean
  /** Contact à éditer (mode API) ; `null` = création. */
  contact: ClientContactResponse | null
  onOpenChange: (open: boolean) => void
  /**
   * Brouillon à éditer en mode local (client pas encore créé). Ignoré si
   * `contact` est fourni.
   */
  draft?: CreateClientContactInput | null
  /**
   * Si fourni, le formulaire travaille en local : il renvoie la saisie via ce
   * callback au lieu d'appeler l'API (utilisé pendant la création d'un client).
   */
  onSubmitDraft?: (input: CreateClientContactInput) => void
}

interface FormState {
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  phone: string
  isPrimary: boolean
  receivesInvoices: boolean
  receivesDeliveryNotifications: boolean
  active: boolean
}

function emptyForm(): FormState {
  return {
    firstName: "",
    lastName: "",
    jobTitle: "",
    email: "",
    phone: "",
    isPrimary: false,
    receivesInvoices: false,
    receivesDeliveryNotifications: false,
    active: true,
  }
}

function toFormState(contact: ClientContactResponse): FormState {
  return {
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    jobTitle: contact.jobTitle ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    isPrimary: contact.isPrimary,
    receivesInvoices: contact.receivesInvoices,
    receivesDeliveryNotifications: contact.receivesDeliveryNotifications,
    active: contact.active,
  }
}

function draftToFormState(input: CreateClientContactInput): FormState {
  return {
    firstName: input.firstName ?? "",
    lastName: input.lastName ?? "",
    jobTitle: input.jobTitle ?? "",
    email: input.email ?? "",
    phone: input.phone ?? "",
    isPrimary: input.isPrimary ?? false,
    receivesInvoices: input.receivesInvoices ?? false,
    receivesDeliveryNotifications: input.receivesDeliveryNotifications ?? false,
    active: true,
  }
}

function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function ClientContactFormDialog({
  companyId,
  clientId,
  open,
  contact,
  onOpenChange,
  draft,
  onSubmitDraft,
}: ClientContactFormDialogProps) {
  const { t } = useTranslation()
  const isDraftMode = typeof onSubmitDraft === "function"
  const isEdit = contact !== null || (isDraftMode && draft != null)
  const createContact = useCreateContact(companyId, clientId)
  const updateContact = useUpdateContact(
    companyId,
    clientId,
    contact?.id ?? "",
  )
  const mutation = contact !== null ? updateContact : createContact

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(
      contact
        ? toFormState(contact)
        : draft
          ? draftToFormState(draft)
          : emptyForm(),
    )
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact, draft])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    // Le dialog est porté dans un portal mais reste un descendant React du
    // formulaire de création de client : sans cela, l'événement submit
    // remonterait jusqu'à lui et déclencherait la création du client.
    event.stopPropagation()

    const base = {
      firstName: nz(form.firstName),
      lastName: nz(form.lastName),
      jobTitle: nz(form.jobTitle),
      email: nz(form.email),
      phone: nz(form.phone),
      isPrimary: form.isPrimary,
      receivesInvoices: form.receivesInvoices,
      receivesDeliveryNotifications: form.receivesDeliveryNotifications,
    }

    if (isDraftMode) {
      onSubmitDraft!(base)
      onOpenChange(false)
      return
    }

    try {
      if (contact !== null) {
        const input: UpdateClientContactInput = { ...base, active: form.active }
        await updateContact.mutateAsync(input)
      } else {
        const input: CreateClientContactInput = base
        await createContact.mutateAsync(input)
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("clients.contacts.editTitle")
              : t("clients.contacts.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("clients.contacts.formDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mutation.isError && !hasFieldErrors && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(mutation.error)}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="contactFirstName"
              label={t("common.firstName")}
              placeholder={t("common.placeholders.firstName")}
              value={form.firstName}
              onChange={(e) => set("firstName")(e.target.value)}
              error={fieldErrors.firstName}
              autoComplete="off"
            />
            <FormField
              id="contactLastName"
              label={t("common.lastName")}
              placeholder={t("common.placeholders.lastName")}
              value={form.lastName}
              onChange={(e) => set("lastName")(e.target.value)}
              error={fieldErrors.lastName}
              autoComplete="off"
            />
          </div>
          <FormField
            id="contactJobTitle"
            label={t("clients.contacts.jobTitle")}
            placeholder={t("clients.contacts.jobTitlePlaceholder")}
            value={form.jobTitle}
            onChange={(e) => set("jobTitle")(e.target.value)}
            error={fieldErrors.jobTitle}
            autoComplete="off"
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id="contactEmail"
              type="email"
              label={t("clients.fields.email")}
              placeholder={t("common.placeholders.email")}
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              error={fieldErrors.email}
              autoComplete="off"
            />
            <FormField
              id="contactPhone"
              label={t("clients.fields.phone")}
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              error={fieldErrors.phone}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-3">
            <CheckboxField
              id="contactIsPrimary"
              label={t("clients.contacts.isPrimary")}
              checked={form.isPrimary}
              onCheckedChange={set("isPrimary")}
            />
            <CheckboxField
              id="contactReceivesInvoices"
              label={t("clients.contacts.receivesInvoices")}
              checked={form.receivesInvoices}
              onCheckedChange={set("receivesInvoices")}
            />
            <CheckboxField
              id="contactReceivesDeliveries"
              label={t("clients.contacts.receivesDeliveryNotifications")}
              checked={form.receivesDeliveryNotifications}
              onCheckedChange={set("receivesDeliveryNotifications")}
            />
            {contact !== null && (
              <CheckboxField
                id="contactActive"
                label={t("clients.contacts.active")}
                checked={form.active}
                onCheckedChange={set("active")}
              />
            )}
          </div>

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
              {isEdit ? t("common.save") : t("clients.contacts.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
