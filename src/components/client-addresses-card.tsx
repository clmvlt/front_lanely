import { useState } from "react"
import { useTranslation } from "react-i18next"
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"
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
import { ClientAddressFormDialog } from "@/components/client-address-form-dialog"
import { RouteMap } from "@/features/map"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { useDeleteAddress, type ClientAddressResponse } from "@/features/clients"

interface ClientAddressesCardProps {
  companyId: string
  clientId: string
  addresses: ClientAddressResponse[]
  canManage: boolean
}

function formatLines(address: ClientAddressResponse): string {
  const a = address.address
  return [a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(" "), a.state, a.country]
    .filter((part) => part && part.trim())
    .join(", ")
}

export function ClientAddressesCard({
  companyId,
  clientId,
  addresses,
  canManage,
}: ClientAddressesCardProps) {
  const { t } = useTranslation()
  const deleteAddress = useDeleteAddress(companyId, clientId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClientAddressResponse | null>(null)
  const [toDelete, setToDelete] = useState<ClientAddressResponse | null>(null)
  const [viewing, setViewing] = useState<ClientAddressResponse | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (address: ClientAddressResponse) => {
    setEditing(address)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteAddress.mutateAsync(toDelete.id)
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
            {t("clients.addresses.title")}
          </CardTitle>
          <CardDescription>
            {t("clients.addresses.description")}
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
            {t("clients.addresses.create")}
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {addresses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("clients.addresses.empty")}
          </p>
        )}

        {addresses.map((address) => {
          const lines = formatLines(address)
          const hasCoords =
            address.latitude != null && address.longitude != null
          return (
            <div
              key={address.id}
              className="flex flex-wrap items-start gap-3 rounded-md border p-3"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <MapPin className="size-4" />
              </span>
              <div className="min-w-0 grow basis-48">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {address.label || t(`clients.addressType.${address.type}`)}
                  </p>
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                    {t(`clients.addressType.${address.type}`)}
                  </span>
                  {!address.active && (
                    <span className="rounded-full bg-[var(--status-pending-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-pending-text)]">
                      {t("clients.addresses.inactive")}
                    </span>
                  )}
                </div>
                {lines && (
                  <p className="truncate text-xs text-muted-foreground">
                    {lines}
                  </p>
                )}
                {(address.contactName || address.contactPhone) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {[address.contactName, address.contactPhone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {address.deliveryInstructions && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {address.deliveryInstructions}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {address.isPrimary && (
                    <span className="rounded-full bg-[var(--status-delivered-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-delivered-text)]">
                      {t("clients.addresses.badgePrimary")}
                    </span>
                  )}
                  {address.isDefaultBilling && (
                    <span className="rounded-full bg-[var(--status-collected-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-collected-text)]">
                      {t("clients.addresses.badgeBilling")}
                    </span>
                  )}
                  {address.isDefaultShipping && (
                    <span className="rounded-full bg-[var(--status-transit-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-transit-text)]">
                      {t("clients.addresses.badgeShipping")}
                    </span>
                  )}
                  {hasCoords && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setViewing(address)
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground hover:underline"
                    >
                      <MapPin className="size-3" />
                      {t("clients.addresses.viewOnMap")}
                    </button>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(address)}
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
                      deleteAddress.reset()
                      setToDelete(address)
                    }}
                    aria-label={t("clients.addresses.delete")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>

      <ClientAddressFormDialog
        companyId={companyId}
        clientId={clientId}
        open={formOpen}
        address={editing}
        onOpenChange={setFormOpen}
      />

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewing?.label ||
                (viewing ? t(`clients.addressType.${viewing.type}`) : "")}
            </DialogTitle>
            {viewing && formatLines(viewing) && (
              <DialogDescription>{formatLines(viewing)}</DialogDescription>
            )}
          </DialogHeader>

          {viewing?.latitude != null && viewing?.longitude != null && (
            <RouteMap
              markers={[
                {
                  latitude: viewing.latitude,
                  longitude: viewing.longitude,
                  tone: "depot",
                  title: viewing.label ?? undefined,
                },
              ]}
              className="h-[24rem]"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteAddress.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.addresses.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("clients.addresses.deleteBody", {
                name:
                  toDelete?.label ||
                  (toDelete ? t(`clients.addressType.${toDelete.type}`) : ""),
              })}
            </DialogDescription>
          </DialogHeader>

          {deleteAddress.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteAddress.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteAddress.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteAddress.isPending}
              onClick={confirmDelete}
            >
              {t("clients.addresses.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
