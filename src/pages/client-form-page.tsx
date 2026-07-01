import { useEffect, useRef, useState } from "react"
import type * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, MapPin, Pencil, Plus, Trash2, User } from "lucide-react"
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
import { SelectField } from "@/components/select-field"
import { TextareaField } from "@/components/textarea-field"
import { CheckboxField } from "@/components/checkbox-field"
import { ClientAddressesCard } from "@/components/client-addresses-card"
import { ClientAddressFormDialog } from "@/components/client-address-form-dialog"
import { ClientContactsCard } from "@/components/client-contacts-card"
import { ClientContactFormDialog } from "@/components/client-contact-form-dialog"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { languageForCountry } from "@/lib/countries"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { useBack } from "@/lib/use-back"
import { cn } from "@/lib/utils"
import { useCompany } from "@/app/company-context"
import { useCompanyDetail, useCompanyMembers } from "@/features/companies"
import {
  clientKeys,
  clientsApi,
  useClient,
  useCreateClient,
  useUpdateClient,
  type ClientResponse,
  type ClientType,
  type CreateClientAddressInput,
  type CreateClientContactInput,
  type CreateClientInput,
  type UpdateClientInput,
} from "@/features/clients"

interface FormState {
  type: ClientType
  name: string
  reference: string
  legalName: string
  registrationNumber: string
  vatNumber: string
  legalForm: string
  email: string
  phone: string
  website: string
  paymentTermsDays: string
  billingEmail: string
  accountManagerUserId: string
  preferredLanguage: "en" | "fr"
  autoSendInvoiceEmail: boolean
  autoSendDeliveryNotifications: boolean
  autoSendPaymentReminders: boolean
  deliveryBlocked: boolean
  notes: string
}

function emptyForm(): FormState {
  return {
    type: "COMPANY",
    name: "",
    reference: "",
    legalName: "",
    registrationNumber: "",
    vatNumber: "",
    legalForm: "",
    email: "",
    phone: "",
    website: "",
    paymentTermsDays: "30",
    billingEmail: "",
    accountManagerUserId: "",
    preferredLanguage: "en",
    autoSendInvoiceEmail: false,
    autoSendDeliveryNotifications: false,
    autoSendPaymentReminders: false,
    deliveryBlocked: false,
    notes: "",
  }
}

function toFormState(client: ClientResponse): FormState {
  const legal = client.legalInfo
  const settings = client.settings
  return {
    type: client.type,
    name: client.name,
    reference: client.reference,
    legalName: legal?.legalName ?? "",
    registrationNumber: legal?.registrationNumber ?? "",
    vatNumber: legal?.vatNumber ?? "",
    legalForm: legal?.legalForm ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    website: client.website ?? "",
    paymentTermsDays: String(client.paymentTermsDays),
    billingEmail: settings.billingEmail ?? "",
    accountManagerUserId: client.accountManagerUserId ?? "",
    preferredLanguage: settings.preferredLanguage,
    autoSendInvoiceEmail: settings.autoSendInvoiceEmail,
    autoSendDeliveryNotifications: settings.autoSendDeliveryNotifications,
    autoSendPaymentReminders: settings.autoSendPaymentReminders,
    deliveryBlocked: client.deliveryBlocked,
    notes: client.notes ?? "",
  }
}

/** "" → null, en supprimant les espaces superflus. */
function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function formatDraftLines(input: CreateClientAddressInput): string {
  const a = input.address
  if (!a) return ""
  return [
    a.line1,
    a.line2,
    [a.postalCode, a.city].filter(Boolean).join(" "),
    a.state,
    a.country,
  ]
    .filter((part) => part && part.trim())
    .join(", ")
}

interface ClientFormProps {
  companyId: string
  /** Client à éditer ; `null` = mode création. */
  client: ClientResponse | null
}

function ClientForm({ companyId, client }: ClientFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = client !== null
  const createClient = useCreateClient(companyId)
  const updateClient = useUpdateClient(companyId, client?.id ?? "")
  const mutation = isEdit ? updateClient : createClient
  const members = useCompanyMembers(companyId)
  const companyDetail = useCompanyDetail(companyId)

  // À la création, la langue préférée par défaut suit le pays de la société.
  const defaultLanguage = languageForCountry(
    companyDetail.data?.billingAddress?.country,
  )
  const languageTouched = useRef(false)

  const [form, setForm] = useState<FormState>(() =>
    client ? toFormState(client) : emptyForm(),
  )

  // Le détail de la société peut arriver après le montage : on aligne la
  // langue tant que l'utilisateur n'y a pas touché (création uniquement).
  useEffect(() => {
    if (isEdit || languageTouched.current) return
    setForm((prev) =>
      prev.preferredLanguage === defaultLanguage
        ? prev
        : { ...prev, preferredLanguage: defaultLanguage },
    )
  }, [isEdit, defaultLanguage])

  const backTo = isEdit
    ? `/app/company/clients/${client.id}`
    : "/app/company/clients"
  const back = useBack(backTo)

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
    (isConflict ? getErrorMessage(mutation.error) ?? undefined : undefined)

  const typeOptions = [
    { value: "COMPANY", label: t("clients.type.COMPANY") },
    { value: "INDIVIDUAL", label: t("clients.type.INDIVIDUAL") },
  ]
  const languageOptions = [
    { value: "en", label: t("clients.languages.en") },
    { value: "fr", label: t("clients.languages.fr") },
  ]
  const managerOptions = (members.data ?? []).map((member) => ({
    value: member.userId,
    label: `${member.firstName} ${member.lastName}`.trim() || member.email,
  }))

  const tabs = [
    {
      id: "identity" as const,
      label: t("clients.form.identity"),
      errorKeys: [
        "type",
        "reference",
        "name",
        "legalInfo.legalName",
        "legalInfo.legalForm",
        "legalInfo.registrationNumber",
        "legalInfo.vatNumber",
      ],
    },
    {
      id: "contact" as const,
      label: t("clients.form.contactInfo"),
      errorKeys: ["email", "phone", "website"],
    },
    {
      id: "address" as const,
      label: t("clients.addresses.title"),
      errorKeys: [],
    },
    {
      id: "contacts" as const,
      label: t("clients.contacts.title"),
      errorKeys: [],
    },
    {
      id: "billing" as const,
      label: t("clients.form.billing"),
      errorKeys: ["paymentTermsDays", "settings.billingEmail"],
    },
    {
      id: "preferences" as const,
      label: t("clients.form.preferences"),
      errorKeys: ["accountManagerUserId", "notes"],
    },
  ]
  type TabId = (typeof tabs)[number]["id"]
  const [activeTab, setActiveTab] = useState<TabId>("identity")

  // Création : les adresses sont saisies en local puis créées une fois le
  // client créé (elles dépendent de son id). Édition : gérées directement par
  // ClientAddressesCard (le client existe déjà).
  const [draftAddresses, setDraftAddresses] = useState<
    CreateClientAddressInput[]
  >([])
  const [addrDialogOpen, setAddrDialogOpen] = useState(false)
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(
    null,
  )

  const openCreateDraft = () => {
    setEditingDraftIndex(null)
    setAddrDialogOpen(true)
  }
  const openEditDraft = (index: number) => {
    setEditingDraftIndex(index)
    setAddrDialogOpen(true)
  }
  const removeDraft = (index: number) =>
    setDraftAddresses((prev) => prev.filter((_, i) => i !== index))
  const submitDraft = (input: CreateClientAddressInput) =>
    setDraftAddresses((prev) =>
      editingDraftIndex === null
        ? [...prev, input]
        : prev.map((d, i) => (i === editingDraftIndex ? input : d)),
    )

  const [draftContacts, setDraftContacts] = useState<
    CreateClientContactInput[]
  >([])
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(
    null,
  )

  const openCreateContactDraft = () => {
    setEditingContactIndex(null)
    setContactDialogOpen(true)
  }
  const openEditContactDraft = (index: number) => {
    setEditingContactIndex(index)
    setContactDialogOpen(true)
  }
  const removeContactDraft = (index: number) =>
    setDraftContacts((prev) => prev.filter((_, i) => i !== index))
  const submitContactDraft = (input: CreateClientContactInput) =>
    setDraftContacts((prev) =>
      editingContactIndex === null
        ? [...prev, input]
        : prev.map((d, i) => (i === editingContactIndex ? input : d)),
    )

  const tabHasError = (tab: (typeof tabs)[number]) =>
    tab.errorKeys.some((key) => fieldErrors[key]) ||
    (tab.id === "identity" && isConflict)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const legalInfo = {
      legalName: nz(form.legalName),
      registrationNumber: nz(form.registrationNumber),
      vatNumber: nz(form.vatNumber),
      legalForm: nz(form.legalForm),
    }
    const hasLegal = Object.values(legalInfo).some((v) => v !== null)

    const parsedTerms = Number.parseInt(form.paymentTermsDays, 10)
    const paymentTermsDays = Number.isNaN(parsedTerms) ? undefined : parsedTerms

    const settings = {
      preferredLanguage: form.preferredLanguage,
      autoSendInvoiceEmail: form.autoSendInvoiceEmail,
      autoSendDeliveryNotifications: form.autoSendDeliveryNotifications,
      autoSendPaymentReminders: form.autoSendPaymentReminders,
      billingEmail: nz(form.billingEmail),
    }

    try {
      if (isEdit) {
        const input: UpdateClientInput = {
          type: form.type,
          name: form.name.trim(),
          reference: nz(form.reference),
          legalInfo: hasLegal ? legalInfo : null,
          email: nz(form.email),
          phone: nz(form.phone),
          website: nz(form.website),
          paymentTermsDays: paymentTermsDays ?? null,
          deliveryBlocked: form.deliveryBlocked,
          accountManagerUserId: nz(form.accountManagerUserId),
          notes: nz(form.notes),
          settings,
        }
        await updateClient.mutateAsync(input)
        navigate(`/app/company/clients/${client.id}`)
      } else {
        const input: CreateClientInput = {
          type: form.type,
          name: form.name.trim(),
          reference: nz(form.reference),
          legalInfo: hasLegal ? legalInfo : null,
          email: nz(form.email),
          phone: nz(form.phone),
          website: nz(form.website),
          paymentTermsDays,
          accountManagerUserId: nz(form.accountManagerUserId),
          notes: nz(form.notes),
          settings,
        }
        const created = await createClient.mutateAsync(input)
        // Le client existe : on crée ses adresses et contacts saisis en local.
        // On laisse passer un échec ponctuel (la page de détail reflètera ce
        // qui a abouti).
        if (draftAddresses.length > 0 || draftContacts.length > 0) {
          await Promise.allSettled([
            ...draftAddresses.map((addr) =>
              clientsApi.createAddress(companyId, created.id, addr),
            ),
            ...draftContacts.map((c) =>
              clientsApi.createContact(companyId, created.id, c),
            ),
          ])
          // Ces créations passent hors React Query : le détail mis en cache par
          // useCreateClient ne contient pas encore adresses/contacts. On
          // l'invalide pour que la page de détail recharge la version à jour.
          queryClient.invalidateQueries({
            queryKey: clientKeys.detail(companyId, created.id),
          })
        }
        navigate(`/app/company/clients/${created.id}`)
      }
    } catch {
      /* erreur affichée via mutation.error */
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={back}
        className="-ml-2 w-fit"
      >
        <ArrowLeft />
        {isEdit ? t("clients.form.backToClient") : t("clients.detail.back")}
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {isEdit
              ? t("clients.form.editTitle")
              : t("clients.form.createTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? t("clients.form.editDescription")
              : t("clients.form.createDescription")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={back}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={mutation.isPending}
            disabled={!form.name.trim()}
          >
            {isEdit ? t("common.save") : t("clients.form.create")}
          </Button>
        </div>
      </div>

      {mutation.isError && !hasFieldErrors && !isConflict && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
        </Alert>
      )}

      <div
        role="tablist"
        className="flex w-full flex-wrap gap-1 rounded-md bg-accent/60 p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tabHasError(tab) && (
              <span className="size-1.5 rounded-full bg-destructive" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "identity" && (
        <Card>
          <CardContent className="grid gap-3">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <SelectField
                id="clientType"
                label={t("clients.fields.type")}
                value={form.type}
                onChange={(v) => set("type")(v as ClientType)}
                options={typeOptions}
                error={fieldErrors.type}
              />
              <FormField
                id="clientReference"
                label={t("clients.fields.reference")}
                placeholder={t("clients.form.referencePlaceholder")}
                value={form.reference}
                onChange={(e) => set("reference")(e.target.value)}
                error={referenceError}
                autoComplete="off"
              />
            </div>
            <FormField
              id="clientName"
              label={t("clients.fields.name")}
              placeholder={t("clients.form.namePlaceholder")}
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              error={fieldErrors.name}
              autoComplete="off"
            />
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="clientLegalName"
                label={t("clients.fields.legalName")}
                placeholder={t("clients.form.legalNamePlaceholder")}
                value={form.legalName}
                onChange={(e) => set("legalName")(e.target.value)}
                error={fieldErrors["legalInfo.legalName"]}
                autoComplete="off"
              />
              <FormField
                id="clientLegalForm"
                label={t("clients.fields.legalForm")}
                placeholder={t("clients.form.legalFormPlaceholder")}
                value={form.legalForm}
                onChange={(e) => set("legalForm")(e.target.value)}
                error={fieldErrors["legalInfo.legalForm"]}
                autoComplete="off"
              />
              <FormField
                id="clientRegistrationNumber"
                label={t("clients.fields.registrationNumber")}
                placeholder={t("clients.form.registrationNumberPlaceholder")}
                value={form.registrationNumber}
                onChange={(e) => set("registrationNumber")(e.target.value)}
                error={fieldErrors["legalInfo.registrationNumber"]}
                autoComplete="off"
              />
              <FormField
                id="clientVatNumber"
                label={t("clients.fields.vatNumber")}
                placeholder={t("clients.form.vatNumberPlaceholder")}
                value={form.vatNumber}
                onChange={(e) => set("vatNumber")(e.target.value)}
                error={fieldErrors["legalInfo.vatNumber"]}
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "contact" && (
        <Card>
          <CardContent className="grid gap-3">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="clientEmail"
                type="email"
                label={t("clients.fields.email")}
                placeholder={t("common.placeholders.email")}
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                error={fieldErrors.email}
                autoComplete="off"
              />
              <FormField
                id="clientPhone"
                label={t("clients.fields.phone")}
                placeholder={t("clients.form.phonePlaceholder")}
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                error={fieldErrors.phone}
                autoComplete="off"
              />
            </div>
            <FormField
              id="clientWebsite"
              label={t("clients.fields.website")}
              placeholder={t("clients.form.websitePlaceholder")}
              value={form.website}
              onChange={(e) => set("website")(e.target.value)}
              error={fieldErrors.website}
              autoComplete="off"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "address" && isEdit && (
        <ClientAddressesCard
          companyId={companyId}
          clientId={client.id}
          addresses={client.addresses}
          canManage
        />
      )}

      {activeTab === "address" && !isEdit && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">
                {t("clients.addresses.title")}
              </CardTitle>
              <CardDescription>
                {t("clients.addresses.draftHint")}
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={openCreateDraft}
              className="shrink-0"
            >
              <Plus />
              {t("clients.addresses.create")}
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            {draftAddresses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("clients.addresses.empty")}
              </p>
            )}

            {draftAddresses.map((draft, index) => {
              const lines = formatDraftLines(draft)
              const typeLabel = t(
                `clients.addressType.${draft.type ?? "DEPOT"}`,
              )
              return (
                <div
                  key={index}
                  className="flex flex-wrap items-start gap-3 rounded-md border p-3"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0 grow basis-48">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {draft.label || typeLabel}
                      </p>
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                        {typeLabel}
                      </span>
                    </div>
                    {lines && (
                      <p className="truncate text-xs text-muted-foreground">
                        {lines}
                      </p>
                    )}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDraft(index)}
                      aria-label={t("common.save")}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeDraft(index)}
                      aria-label={t("clients.addresses.delete")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>

          <ClientAddressFormDialog
            companyId={companyId}
            clientId=""
            open={addrDialogOpen}
            address={null}
            draft={
              editingDraftIndex === null
                ? null
                : draftAddresses[editingDraftIndex]
            }
            onSubmitDraft={submitDraft}
            onOpenChange={setAddrDialogOpen}
          />
        </Card>
      )}

      {activeTab === "contacts" && isEdit && (
        <ClientContactsCard
          companyId={companyId}
          clientId={client.id}
          contacts={client.contacts}
          canManage
        />
      )}

      {activeTab === "contacts" && !isEdit && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">
                {t("clients.contacts.title")}
              </CardTitle>
              <CardDescription>
                {t("clients.contacts.draftHint")}
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={openCreateContactDraft}
              className="shrink-0"
            >
              <Plus />
              {t("clients.contacts.create")}
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            {draftContacts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("clients.contacts.empty")}
              </p>
            )}

            {draftContacts.map((draft, index) => {
              const name =
                [draft.firstName, draft.lastName].filter(Boolean).join(" ") ||
                draft.email ||
                t("clients.contacts.unnamed")
              const details = [draft.email, draft.phone]
                .filter(Boolean)
                .join(" · ")
              return (
                <div
                  key={index}
                  className="flex flex-wrap items-start gap-3 rounded-md border p-3"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <User className="size-4" />
                  </span>
                  <div className="min-w-0 grow basis-48">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {name}
                    </p>
                    {draft.jobTitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {draft.jobTitle}
                      </p>
                    )}
                    {details && (
                      <p className="truncate text-xs text-muted-foreground">
                        {details}
                      </p>
                    )}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditContactDraft(index)}
                      aria-label={t("common.save")}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeContactDraft(index)}
                      aria-label={t("clients.contacts.delete")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>

          <ClientContactFormDialog
            companyId={companyId}
            clientId=""
            open={contactDialogOpen}
            contact={null}
            draft={
              editingContactIndex === null
                ? null
                : draftContacts[editingContactIndex]
            }
            onSubmitDraft={submitContactDraft}
            onOpenChange={setContactDialogOpen}
          />
        </Card>
      )}

      {activeTab === "billing" && (
        <Card>
          <CardContent className="grid gap-3">
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="clientPaymentTerms"
                type="number"
                min={0}
                max={365}
                label={t("clients.fields.paymentTermsDays")}
                value={form.paymentTermsDays}
                onChange={(e) => set("paymentTermsDays")(e.target.value)}
                hint={t("clients.form.paymentTermsHint")}
                error={fieldErrors.paymentTermsDays}
                autoComplete="off"
              />
              <FormField
                id="clientBillingEmail"
                type="email"
                label={t("clients.fields.billingEmail")}
                placeholder={t("common.placeholders.email")}
                value={form.billingEmail}
                onChange={(e) => set("billingEmail")(e.target.value)}
                error={fieldErrors["settings.billingEmail"]}
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "preferences" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("clients.form.accountManager")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SelectField
                id="clientAccountManager"
                label={t("clients.fields.accountManager")}
                value={form.accountManagerUserId}
                onChange={set("accountManagerUserId")}
                options={managerOptions}
                placeholder={t("clients.form.accountManagerNone")}
                error={fieldErrors.accountManagerUserId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("clients.form.preferences")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <SelectField
                id="clientPreferredLanguage"
                label={t("clients.fields.preferredLanguage")}
                value={form.preferredLanguage}
                onChange={(v) => {
                  languageTouched.current = true
                  set("preferredLanguage")(v as "en" | "fr")
                }}
                options={languageOptions}
              />
              <div className="grid gap-3 pt-1">
                <CheckboxField
                  id="clientAutoInvoice"
                  label={t("clients.fields.autoSendInvoiceEmail")}
                  checked={form.autoSendInvoiceEmail}
                  onCheckedChange={set("autoSendInvoiceEmail")}
                />
                <CheckboxField
                  id="clientAutoDelivery"
                  label={t("clients.fields.autoSendDeliveryNotifications")}
                  checked={form.autoSendDeliveryNotifications}
                  onCheckedChange={set("autoSendDeliveryNotifications")}
                />
                <CheckboxField
                  id="clientAutoReminders"
                  label={t("clients.fields.autoSendPaymentReminders")}
                  checked={form.autoSendPaymentReminders}
                  onCheckedChange={set("autoSendPaymentReminders")}
                />
                {isEdit && (
                  <CheckboxField
                    id="clientDeliveryBlocked"
                    label={t("clients.fields.deliveryBlocked")}
                    description={t("clients.form.deliveryBlockedHint")}
                    checked={form.deliveryBlocked}
                    onCheckedChange={set("deliveryBlocked")}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("clients.form.notes")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TextareaField
                id="clientNotes"
                label={t("clients.fields.notes")}
                placeholder={t("clients.form.notesPlaceholder")}
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                error={fieldErrors.notes}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </form>
  )
}

export function ClientFormPage() {
  const { t } = useTranslation()
  const { clientId } = useParams()
  const { selectedCompany } = useCompany()
  const isEdit = clientId !== undefined
  const back = useBack(
    isEdit ? `/app/company/clients/${clientId}` : "/app/company/clients",
  )

  const companyId = selectedCompany?.companyId ?? ""
  const canManage = hasPermission(
    selectedCompany,
    KNOWN_PERMISSIONS.MANAGE_CLIENTS,
  )

  const clientQuery = useClient(companyId, isEdit ? clientId : "")

  if (!selectedCompany || !canManage) {
    return <Navigate to="/app/company/clients" replace />
  }

  const backLink = (
    <Button
      variant="ghost"
      size="sm"
      onClick={back}
      className="-ml-2 w-fit"
    >
      <ArrowLeft />
      {t("clients.detail.back")}
    </Button>
  )

  if (!isEdit) {
    return <ClientForm companyId={companyId} client={null} />
  }

  if (clientQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  const client = clientQuery.data
  const isNotFound =
    clientQuery.error instanceof ApiError && clientQuery.error.status === 404

  if (!client) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertDescription>
            {isNotFound
              ? t("clients.detail.notFound")
              : getErrorMessage(clientQuery.error) ?? t("common.error")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <ClientForm companyId={companyId} client={client} />
}
