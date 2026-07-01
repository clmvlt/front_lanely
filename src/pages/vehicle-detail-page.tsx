import { useState } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ParseKeys } from "i18next"
import { Archive, ArchiveRestore, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import {
  Card,
  CardContent,
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
import { VehicleFormDialog } from "@/components/vehicle-form-dialog"
import { VehicleDocumentsCard } from "@/components/vehicle-documents-card"
import { VehicleMileageCard } from "@/components/vehicle-mileage-card"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { formatCivilDate, formatDate } from "@/lib/date"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { useBack } from "@/lib/use-back"
import { cn } from "@/lib/utils"
import { useCompany } from "@/app/company-context"
import {
  useArchiveVehicle,
  useDeleteVehicle,
  useRestoreVehicle,
  useVehicle,
  type VehicleResponse,
  type VehicleStatus,
} from "@/features/vehicles"

const STATUS_BADGE: Record<VehicleStatus, string> = {
  ACTIVE: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
  INACTIVE: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  SOLD: "bg-[var(--status-collected-bg)] text-[var(--status-collected-text)]",
  OUT_OF_SERVICE:
    "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]",
  ARCHIVED: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
}

type Tab = "info" | "documents" | "mileage"

interface InfoRowProps {
  label: string
  value: string | number | null | undefined
}

function InfoRow({ label, value }: InfoRowProps) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-neutral-900">{value}</dd>
    </div>
  )
}

function InfoSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  )
}

function VehicleInfo({ vehicle }: { vehicle: VehicleResponse }) {
  const { t } = useTranslation()
  const f = (key: string): string => t(`vehicles.fields.${key}` as ParseKeys)
  const ins = vehicle.insurance
  const hasInsurance =
    ins &&
    Object.values(ins).some((v) => v !== null && v !== undefined && v !== "")

  return (
    <div className="flex flex-col gap-6">
      <InfoSection title={t("vehicles.detail.identification")}>
        <InfoRow label={f("registrationPlate")} value={vehicle.registrationPlate} />
        <InfoRow
          label={f("vehicleType")}
          value={t(`vehicles.type.${vehicle.vehicleType}`)}
        />
        <InfoRow label={f("vin")} value={vehicle.vin} />
        <InfoRow label={f("make")} value={vehicle.make} />
        <InfoRow label={f("model")} value={vehicle.model} />
        <InfoRow label={f("version")} value={vehicle.version} />
        <InfoRow
          label={f("firstRegistrationDate")}
          value={formatCivilDate(vehicle.firstRegistrationDate)}
        />
      </InfoSection>

      <InfoSection title={t("vehicles.detail.technical")}>
        <InfoRow
          label={f("fuelType")}
          value={vehicle.fuelType ? t(`vehicles.fuel.${vehicle.fuelType}`) : null}
        />
        <InfoRow label={f("emissionClass")} value={vehicle.emissionClass} />
      </InfoSection>

      <InfoSection title={t("vehicles.detail.weights")}>
        <InfoRow label={f("grossWeightKg")} value={vehicle.grossWeightKg} />
        <InfoRow label={f("payloadKg")} value={vehicle.payloadKg} />
      </InfoSection>

      <InfoSection title={t("vehicles.detail.registration")}>
        <InfoRow
          label={f("registrationCertificateNumber")}
          value={vehicle.registrationCertificateNumber}
        />
      </InfoSection>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("vehicles.detail.insurance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasInsurance ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label={f("insurerName")} value={ins?.insurerName} />
              <InfoRow label={f("policyNumber")} value={ins?.policyNumber} />
              <InfoRow label={f("coverageType")} value={ins?.coverageType} />
              <InfoRow label={f("insuranceContact")} value={ins?.contact} />
              <InfoRow
                label={f("insuranceStartDate")}
                value={formatCivilDate(ins?.startDate)}
              />
              <InfoRow
                label={f("insuranceEndDate")}
                value={formatCivilDate(ins?.endDate)}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("vehicles.detail.noInsurance")}
            </p>
          )}
        </CardContent>
      </Card>

      <InfoSection title={t("vehicles.detail.regulatory")}>
        <InfoRow
          label={f("technicalInspectionDate")}
          value={formatCivilDate(vehicle.technicalInspectionDate)}
        />
        <InfoRow
          label={f("roadTaxDueDate")}
          value={formatCivilDate(vehicle.roadTaxDueDate)}
        />
      </InfoSection>

      {vehicle.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("vehicles.detail.notes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-neutral-900">
              {vehicle.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        {t("vehicles.detail.createdAt", { date: formatDate(vehicle.createdAt) })}
        {" · "}
        {t("vehicles.detail.updatedAt", {
          date: formatDate(vehicle.updatedAt),
        })}
      </p>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function VehicleDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const back = useBack("/app/company/vehicles")
  const { vehicleId = "" } = useParams()
  const { selectedCompany } = useCompany()
  const [tab, setTab] = useState<Tab>("info")
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const companyId = selectedCompany?.companyId ?? ""
  const canManage = hasPermission(
    selectedCompany,
    KNOWN_PERMISSIONS.MANAGE_VEHICLES,
  )

  const vehicleQuery = useVehicle(companyId, vehicleId)
  const archiveVehicle = useArchiveVehicle(companyId)
  const restoreVehicle = useRestoreVehicle(companyId)
  const deleteVehicle = useDeleteVehicle(companyId)

  if (!selectedCompany) {
    return <Navigate to="/app/company/vehicles" replace />
  }

  const vehicle = vehicleQuery.data
  const isNotFound =
    vehicleQuery.error instanceof ApiError && vehicleQuery.error.status === 404

  const backLink = (
    <Button
      variant="ghost"
      size="sm"
      onClick={back}
      className="-ml-2 w-fit"
    >
      <ArrowLeft />
      {t("vehicles.detail.back")}
    </Button>
  )

  if (vehicleQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <Alert variant="destructive">
          <AlertDescription>
            {isNotFound
              ? t("vehicles.detail.notFound")
              : (getErrorMessage(vehicleQuery.error) ?? t("common.error"))}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isArchived = vehicle.status === "ARCHIVED"
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ")

  const handleArchiveToggle = () => {
    if (isArchived) restoreVehicle.mutate(vehicle.id)
    else archiveVehicle.mutate(vehicle.id)
  }

  const confirmDelete = async () => {
    try {
      await deleteVehicle.mutateAsync(vehicle.id)
      navigate("/app/company/vehicles", { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        navigate("/app/company/vehicles", { replace: true })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
              {vehicle.registrationPlate}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_BADGE[vehicle.status],
              )}
            >
              {t(`vehicles.status.${vehicle.status}`)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(`vehicles.type.${vehicle.vehicleType}`)}
            {makeModel ? ` · ${makeModel}` : ""}
            {vehicle.latestMileageKm !== null
              ? ` · ${vehicle.latestMileageKm.toLocaleString()} ${t("vehicles.mileageUnit")}`
              : ""}
          </p>
        </div>

        {canManage && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveToggle}
              loading={archiveVehicle.isPending || restoreVehicle.isPending}
            >
              {isArchived ? <ArchiveRestore /> : <Archive />}
              {isArchived
                ? t("vehicles.detail.restore")
                : t("vehicles.detail.archive")}
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil />
              {t("vehicles.detail.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                deleteVehicle.reset()
                setDeleteOpen(true)
              }}
              aria-label={t("vehicles.detail.delete")}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      <div
        role="tablist"
        className="inline-flex w-fit flex-wrap gap-1 rounded-md bg-accent/60 p-1"
      >
        <TabButton active={tab === "info"} onClick={() => setTab("info")}>
          {t("vehicles.detail.tabInfo")}
        </TabButton>
        <TabButton
          active={tab === "documents"}
          onClick={() => setTab("documents")}
        >
          {t("vehicles.detail.tabDocuments")} ({vehicle.documents.length})
        </TabButton>
        <TabButton active={tab === "mileage"} onClick={() => setTab("mileage")}>
          {t("vehicles.detail.tabMileage")}
        </TabButton>
      </div>

      {tab === "info" && <VehicleInfo vehicle={vehicle} />}
      {tab === "documents" && (
        <VehicleDocumentsCard
          companyId={companyId}
          vehicleId={vehicle.id}
          canManage={canManage}
        />
      )}
      {tab === "mileage" && (
        <VehicleMileageCard companyId={companyId} vehicleId={vehicle.id} />
      )}

      <VehicleFormDialog
        companyId={companyId}
        open={editOpen}
        vehicle={vehicle}
        onOpenChange={setEditOpen}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleteVehicle.isPending) setDeleteOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("vehicles.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("vehicles.deleteBody", { plate: vehicle.registrationPlate })}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertDescription>
              {t("vehicles.deleteAlternative")}
            </AlertDescription>
          </Alert>

          {deleteVehicle.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteVehicle.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteVehicle.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteVehicle.isPending}
              onClick={confirmDelete}
            >
              {t("vehicles.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
