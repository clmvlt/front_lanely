import { useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArchiveRestore,
  Archive,
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react"
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
import { ClientAddressesCard } from "@/components/client-addresses-card"
import { ClientContactsCard } from "@/components/client-contacts-card"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { formatDate } from "@/lib/date"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { useBack } from "@/lib/use-back"
import { cn } from "@/lib/utils"
import { useCompany } from "@/app/company-context"
import { useCompanyMembers } from "@/features/companies"
import {
  useArchiveClient,
  useClient,
  useDeleteClient,
  useRestoreClient,
  type ClientResponse,
} from "@/features/clients"

interface InfoRowProps {
  label: string
  value: string | null | undefined
}

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-neutral-900">{value}</dd>
    </div>
  )
}

function GeneralInfoCard({
  client,
  managerName,
}: {
  client: ClientResponse
  managerName: string | null
}) {
  const { t } = useTranslation()
  const legal = client.legalInfo
  const settings = client.settings

  const prefs = [
    settings.autoSendInvoiceEmail
      ? t("clients.fields.autoSendInvoiceEmail")
      : null,
    settings.autoSendDeliveryNotifications
      ? t("clients.fields.autoSendDeliveryNotifications")
      : null,
    settings.autoSendPaymentReminders
      ? t("clients.fields.autoSendPaymentReminders")
      : null,
  ].filter(Boolean) as string[]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("clients.detail.general")}</CardTitle>
        <CardDescription>{t("clients.detail.generalDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoRow label={t("clients.fields.type")} value={t(`clients.type.${client.type}`)} />
          <InfoRow label={t("clients.fields.reference")} value={client.reference} />
          <InfoRow label={t("clients.fields.email")} value={client.email} />
          <InfoRow label={t("clients.fields.phone")} value={client.phone} />
          <InfoRow label={t("clients.fields.website")} value={client.website} />
          <InfoRow
            label={t("clients.fields.paymentTermsDays")}
            value={t("clients.detail.days", { count: client.paymentTermsDays })}
          />
          <InfoRow label={t("clients.fields.accountManager")} value={managerName} />
          <InfoRow
            label={t("clients.fields.preferredLanguage")}
            value={t(`clients.languages.${settings.preferredLanguage}`)}
          />
          <InfoRow label={t("clients.fields.billingEmail")} value={settings.billingEmail} />

          <InfoRow label={t("clients.fields.legalName")} value={legal?.legalName} />
          <InfoRow label={t("clients.fields.legalForm")} value={legal?.legalForm} />
          <InfoRow
            label={t("clients.fields.registrationNumber")}
            value={legal?.registrationNumber}
          />
          <InfoRow label={t("clients.fields.vatNumber")} value={legal?.vatNumber} />
        </dl>

        {prefs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {prefs.map((pref) => (
              <span
                key={pref}
                className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
              >
                {pref}
              </span>
            ))}
          </div>
        )}

        {client.notes && (
          <div className="mt-4 grid gap-1">
            <p className="text-xs text-muted-foreground">
              {t("clients.fields.notes")}
            </p>
            <p className="text-sm whitespace-pre-wrap text-neutral-900">
              {client.notes}
            </p>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          {t("clients.detail.createdAt", { date: formatDate(client.createdAt) })}
        </p>
      </CardContent>
    </Card>
  )
}

export function ClientDetailPage() {
  const { t } = useTranslation()
  const { clientId = "" } = useParams()
  const navigate = useNavigate()
  const back = useBack("/app/company/clients")
  const { selectedCompany } = useCompany()
  const [tab, setTab] = useState<"addresses" | "contacts">("addresses")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const companyId = selectedCompany?.companyId ?? ""
  const canManage = hasPermission(
    selectedCompany,
    KNOWN_PERMISSIONS.MANAGE_CLIENTS,
  )

  const clientQuery = useClient(companyId, clientId)
  const members = useCompanyMembers(companyId)
  const archiveClient = useArchiveClient(companyId)
  const restoreClient = useRestoreClient(companyId)
  const deleteClient = useDeleteClient(companyId)

  if (!selectedCompany) {
    return <Navigate to="/app/company/clients" replace />
  }

  const client = clientQuery.data
  const isNotFound =
    clientQuery.error instanceof ApiError && clientQuery.error.status === 404

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

  if (clientQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

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

  const isArchived = client.status === "ARCHIVED"
  const manager = members.data?.find(
    (m) => m.userId === client.accountManagerUserId,
  )
  const managerName = manager
    ? `${manager.firstName} ${manager.lastName}`.trim() || manager.email
    : null

  const handleArchiveToggle = () => {
    if (isArchived) restoreClient.mutate(client.id)
    else archiveClient.mutate(client.id)
  }

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id)
      navigate("/app/company/clients")
    } catch {
      /* erreur affichée dans le dialog */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
              {client.name}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                isArchived
                  ? "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]"
                  : "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
              )}
            >
              {t(`clients.status.${client.status}`)}
            </span>
            {client.deliveryBlocked && (
              <span className="rounded-full bg-[var(--status-failed-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-failed-text)]">
                {t("clients.deliveryBlocked")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`clients.type.${client.type}`)} · {client.reference}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`/app/company/clients/${client.id}/waybills`)
            }
          >
            <FileText />
            {t("clients.detail.waybills")}
          </Button>
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
                loading={archiveClient.isPending || restoreClient.isPending}
              >
                {isArchived ? <ArchiveRestore /> : <Archive />}
                {isArchived ? t("clients.restore") : t("clients.archive")}
              </Button>
            {isArchived && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  deleteClient.reset()
                  setConfirmDelete(true)
                }}
              >
                <Trash2 />
                {t("clients.delete")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() =>
                navigate(`/app/company/clients/${client.id}/edit`)
              }
            >
              <Pencil />
              {t("clients.detail.edit")}
            </Button>
            </>
          )}
        </div>
      </div>

      <GeneralInfoCard client={client} managerName={managerName} />

      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          className="inline-flex w-fit gap-1 rounded-md bg-accent/60 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "addresses"}
            onClick={() => setTab("addresses")}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "addresses"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("clients.addresses.title")} ({client.addresses.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "contacts"}
            onClick={() => setTab("contacts")}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "contacts"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("clients.contacts.title")} ({client.contacts.length})
          </button>
        </div>

        {tab === "addresses" ? (
          <ClientAddressesCard
            companyId={companyId}
            clientId={client.id}
            addresses={client.addresses}
            canManage={canManage}
          />
        ) : (
          <ClientContactsCard
            companyId={companyId}
            clientId={client.id}
            contacts={client.contacts}
            canManage={canManage}
          />
        )}
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open && !deleteClient.isPending) setConfirmDelete(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("clients.deleteBody", { name: client.name })}
            </DialogDescription>
          </DialogHeader>

          {deleteClient.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteClient.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteClient.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteClient.isPending}
              onClick={handleDelete}
            >
              {t("clients.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
