import { useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Contact,
  Fuel,
  Pencil,
  Plus,
  PowerOff,
  Trash2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
import { TariffStatusBadge } from "@/components/tariff-status-badge"
import { TariffFormDialog } from "@/components/tariff-form-dialog"
import { TariffComponentDialog } from "@/components/tariff-component-dialog"
import { FuelSurchargeDialog } from "@/components/fuel-surcharge-dialog"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { formatCivilDate, formatDate } from "@/lib/date"
import { formatMoneyHT, formatUnitPrice } from "@/lib/pricing-format"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { useBack } from "@/lib/use-back"
import { useCompany } from "@/app/company-context"
import {
  useActivateTariff,
  useDeactivateTariff,
  useDeleteFuelSurcharge,
  useDeleteTariff,
  useDeleteTariffComponent,
  useTariff,
  type TariffComponentDto,
  type TariffResponse,
} from "@/features/pricing"

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-neutral-900">{value}</dd>
    </div>
  )
}

function ComponentRow({
  component,
  currency,
  canManage,
  onEdit,
  onDelete,
}: {
  component: TariffComponentDto
  currency: string
  canManage: boolean
  onEdit: (c: TariffComponentDto) => void
  onDelete: (c: TariffComponentDto) => void
}) {
  const { t } = useTranslation()
  const bounds = [
    component.includedQuantity != null
      ? `${t("pricing.component.includedQuantity")}: ${component.includedQuantity}`
      : null,
    component.minQuantity != null
      ? `${t("pricing.component.minQuantity")}: ${component.minQuantity}`
      : null,
    component.maxQuantity != null
      ? `${t("pricing.component.maxQuantity")}: ${component.maxQuantity}`
      : null,
    component.minAmount != null
      ? `${t("pricing.component.minAmount")}: ${formatMoneyHT(component.minAmount, currency)}`
      : null,
    component.maxAmount != null
      ? `${t("pricing.component.maxAmount")}: ${formatMoneyHT(component.maxAmount, currency)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-medium text-accent-foreground tabular-nums">
        {component.position}
      </span>
      <div className="min-w-0 grow basis-48">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">
            {component.label}
          </p>
          <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
            {t(`pricing.basis.${component.basis}`)}
          </span>
        </div>
        {bounds && (
          <p className="truncate text-xs text-muted-foreground">{bounds}</p>
        )}
      </div>
      <span className="shrink-0 text-sm font-semibold text-neutral-900 tabular-nums">
        {formatUnitPrice(t, component.basis, component.unitPrice, currency)}
      </span>
      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(component)}
            aria-label={t("common.edit")}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(component)}
            aria-label={t("pricing.detail.delete")}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

function TariffEditor({
  companyId,
  tariff,
}: {
  companyId: string
  tariff: TariffResponse
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const canManage = hasPermission(useCompany().selectedCompany, KNOWN_PERMISSIONS.MANAGE_PRICING)

  const activate = useActivateTariff(companyId)
  const deactivate = useDeactivateTariff(companyId)
  const deleteTariff = useDeleteTariff(companyId)
  const deleteComponent = useDeleteTariffComponent(companyId, tariff.id)
  const deleteFuel = useDeleteFuelSurcharge(companyId, tariff.id)

  const [editOpen, setEditOpen] = useState(false)
  const [componentTarget, setComponentTarget] =
    useState<TariffComponentDto | null>(null)
  const [componentDialogOpen, setComponentDialogOpen] = useState(false)
  const [fuelOpen, setFuelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [fuelRemoveOpen, setFuelRemoveOpen] = useState(false)
  const [deleteComponentTarget, setDeleteComponentTarget] =
    useState<TariffComponentDto | null>(null)

  const currency = tariff.currency
  const fuel = tariff.fuelSurcharge ?? null
  const components = [...tariff.components].sort(
    (a, b) => a.position - b.position,
  )

  const validity =
    tariff.validFrom && tariff.validUntil
      ? t("pricing.tariffs.validRange", {
          from: formatCivilDate(tariff.validFrom),
          to: formatCivilDate(tariff.validUntil),
        })
      : tariff.validFrom
        ? t("pricing.tariffs.validFrom", {
            date: formatCivilDate(tariff.validFrom),
          })
        : tariff.validUntil
          ? t("pricing.tariffs.validUntil", {
              date: formatCivilDate(tariff.validUntil),
            })
          : t("pricing.tariffs.validAlways")

  const openAddComponent = () => {
    setComponentTarget(null)
    setComponentDialogOpen(true)
  }
  const openEditComponent = (c: TariffComponentDto) => {
    setComponentTarget(c)
    setComponentDialogOpen(true)
  }

  const confirmDelete = async () => {
    try {
      await deleteTariff.mutateAsync(tariff.id)
      navigate("/app/company/pricing", { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        navigate("/app/company/pricing", { replace: true })
      }
    }
  }

  const confirmDeleteComponent = async () => {
    if (!deleteComponentTarget) return
    try {
      await deleteComponent.mutateAsync(deleteComponentTarget.id)
      setDeleteComponentTarget(null)
    } catch {
      /* affiché */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
              {tariff.name}
            </h1>
            <TariffStatusBadge status={tariff.status} />
            {tariff.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                <Building2 className="size-3" />
                {t("pricing.tariffs.defaultBadge")}
              </span>
            ) : tariff.clientId ? (
              <span className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                <Contact className="size-3" />
                {t("pricing.tariffs.clientBound")}
              </span>
            ) : null}
          </div>
          {tariff.description && (
            <p className="text-sm text-muted-foreground">{tariff.description}</p>
          )}
        </div>

        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {tariff.status === "DRAFT" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => activate.mutate(tariff.id)}
                loading={activate.isPending}
              >
                <CheckCircle2 />
                {t("pricing.detail.activate")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deactivate.mutate(tariff.id)}
                loading={deactivate.isPending}
              >
                <PowerOff />
                {t("pricing.detail.deactivate")}
              </Button>
            )}
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil />
              {t("pricing.detail.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                deleteTariff.reset()
                setDeleteOpen(true)
              }}
              aria-label={t("pricing.detail.delete")}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {(activate.isError || deactivate.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(activate.error ?? deactivate.error)}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-foreground">
            {t("pricing.detail.settings")}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoRow label={t("pricing.detail.currency")} value={currency} />
            <InfoRow
              label={t("pricing.detail.rounding")}
              value={`${t(`pricing.roundingMode.${tariff.roundingMode}`)} · ${tariff.roundingScale}`}
            />
            <InfoRow
              label={t("pricing.detail.minCharge")}
              value={
                tariff.minChargeAmount != null
                  ? formatMoneyHT(tariff.minChargeAmount, currency)
                  : null
              }
            />
            <InfoRow label={t("pricing.detail.validity")} value={validity} />
          </dl>
          <p className="text-xs text-muted-foreground">
            {t("pricing.detail.createdAt", {
              date: formatDate(tariff.createdAt),
            })}
            {" · "}
            {t("pricing.detail.updatedAt", {
              date: formatDate(tariff.updatedAt),
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-foreground">
                {t("pricing.detail.components")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("pricing.detail.componentsHint")}
              </p>
            </div>
            {canManage && (
              <Button variant="outline" size="sm" onClick={openAddComponent}>
                <Plus />
                {t("pricing.detail.addComponent")}
              </Button>
            )}
          </div>

          {deleteComponent.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteComponent.error)}
              </AlertDescription>
            </Alert>
          )}

          {components.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("pricing.detail.noComponents")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {components.map((component) => (
                <ComponentRow
                  key={component.id}
                  component={component}
                  currency={currency}
                  canManage={canManage}
                  onEdit={openEditComponent}
                  onDelete={setDeleteComponentTarget}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Fuel className="size-4" />
                {t("pricing.detail.fuel")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("pricing.detail.fuelHint")}
              </p>
            </div>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFuelOpen(true)}
                >
                  {fuel
                    ? t("pricing.detail.fuelEdit")
                    : t("pricing.detail.fuelConfigure")}
                </Button>
                {fuel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      deleteFuel.reset()
                      setFuelRemoveOpen(true)
                    }}
                    aria-label={t("pricing.detail.fuelRemove")}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            )}
          </div>

          {!fuel ? (
            <p className="text-sm text-muted-foreground">
              {t("pricing.detail.fuelNone")}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow
                  label={t("pricing.fuelPolicy.fuelType")}
                  value={`${t(`pricing.fuelType.${fuel.fuelType}`)} · ${
                    fuel.enabled
                      ? t("pricing.detail.fuelEnabled")
                      : t("pricing.detail.fuelDisabled")
                  }`}
                />
                <InfoRow
                  label={t("pricing.fuelPolicy.mode")}
                  value={t(`pricing.fuelMode.${fuel.mode}`)}
                />
                {fuel.mode === "THRESHOLD_COMPONENTS" ? (
                  <InfoRow
                    label={t("pricing.detail.fuelThreshold")}
                    value={
                      fuel.thresholdPrice != null
                        ? `${fuel.thresholdPrice} €/L`
                        : null
                    }
                  />
                ) : (
                  <>
                    <InfoRow
                      label={t("pricing.detail.fuelReference")}
                      value={
                        fuel.referencePrice != null
                          ? `${fuel.referencePrice} €/L`
                          : null
                      }
                    />
                    <InfoRow
                      label={t("pricing.detail.fuelDieselShare")}
                      value={
                        fuel.dieselShareRatio != null
                          ? String(fuel.dieselShareRatio)
                          : null
                      }
                    />
                  </>
                )}
                <InfoRow
                  label={t("pricing.detail.fuelSource")}
                  value={fuel.sourceFilter}
                />
              </dl>

              {fuel.mode === "THRESHOLD_COMPONENTS" &&
                fuel.surchargeComponents.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("pricing.detail.fuelSurchargeLines")}
                    </p>
                    {fuel.surchargeComponents.map((line) => (
                      <div
                        key={line.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-neutral-900">
                            {line.label}
                          </span>
                          <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                            {t(`pricing.basis.${line.basis}`)}
                          </span>
                        </span>
                        <span className="tabular-nums">
                          {formatUnitPrice(
                            t,
                            line.basis,
                            line.unitPrice,
                            currency,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Dialogs --- */}
      <TariffFormDialog
        companyId={companyId}
        open={editOpen}
        tariff={tariff}
        onOpenChange={setEditOpen}
      />
      <TariffComponentDialog
        companyId={companyId}
        tariffId={tariff.id}
        open={componentDialogOpen}
        component={componentTarget}
        onOpenChange={setComponentDialogOpen}
      />
      <FuelSurchargeDialog
        companyId={companyId}
        tariffId={tariff.id}
        open={fuelOpen}
        policy={fuel}
        onOpenChange={setFuelOpen}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!deleteTariff.isPending) setDeleteOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pricing.detail.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("pricing.detail.deleteBody", { name: tariff.name })}
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              {t("pricing.detail.deleteAlternative")}
            </AlertDescription>
          </Alert>
          {deleteTariff.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteTariff.error)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteTariff.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteTariff.isPending}
              onClick={confirmDelete}
            >
              {t("pricing.detail.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fuelRemoveOpen}
        onOpenChange={(next) => {
          if (!deleteFuel.isPending) setFuelRemoveOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pricing.detail.fuelRemoveTitle")}</DialogTitle>
            <DialogDescription>
              {t("pricing.detail.fuelRemoveBody")}
            </DialogDescription>
          </DialogHeader>
          {deleteFuel.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteFuel.error)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFuelRemoveOpen(false)}
              disabled={deleteFuel.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteFuel.isPending}
              onClick={async () => {
                try {
                  await deleteFuel.mutateAsync()
                  setFuelRemoveOpen(false)
                } catch {
                  /* affiché */
                }
              }}
            >
              {t("pricing.detail.fuelRemove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteComponentTarget !== null}
        onOpenChange={(next) => {
          if (!next && !deleteComponent.isPending) setDeleteComponentTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pricing.component.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("pricing.component.deleteBody", {
                label: deleteComponentTarget?.label ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          {deleteComponent.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteComponent.error)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteComponentTarget(null)}
              disabled={deleteComponent.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteComponent.isPending}
              onClick={confirmDeleteComponent}
            >
              {t("pricing.detail.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TariffDetailPage() {
  const { t } = useTranslation()
  const back = useBack("/app/company/pricing")
  const { tariffId = "" } = useParams()
  const { selectedCompany } = useCompany()
  const companyId = selectedCompany?.companyId ?? ""

  const tariffQuery = useTariff(companyId, tariffId)

  if (!selectedCompany) {
    return <Navigate to="/app/company/pricing" replace />
  }

  const backLink = (
    <Button variant="ghost" size="sm" onClick={back} className="-ml-2 w-fit">
      <ArrowLeft />
      {t("pricing.detail.back")}
    </Button>
  )

  const isNotFound =
    tariffQuery.error instanceof ApiError && tariffQuery.error.status === 404

  if (tariffQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (!tariffQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertDescription>
            {isNotFound
              ? t("pricing.detail.notFound")
              : (getErrorMessage(tariffQuery.error) ?? t("common.error"))}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}
      <TariffEditor companyId={companyId} tariff={tariffQuery.data} />
    </div>
  )
}
