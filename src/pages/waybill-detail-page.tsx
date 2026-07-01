import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ParseKeys } from "i18next"
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  History,
  MapPin,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Truck,
  X,
} from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SelectField } from "@/components/select-field"
import { TextareaField } from "@/components/textarea-field"
import { RouteMap } from "@/features/map"
import {
  ParcelStatusBadge,
  WaybillStatusBadge,
} from "@/components/transport-status-badge"
import { DockDwellBadge } from "@/components/dock-dwell"
import { StatusHistoryDialog } from "@/components/status-history-dialog"
import { WaybillFormDialog } from "@/components/waybill-form-dialog"
import { WaybillPricingCard } from "@/components/waybill-pricing-card"
import { TourCombobox } from "@/components/tour-combobox"
import { AssigneeSelect } from "@/components/transport-selects"
import { getErrorMessage } from "@/lib/api-error"
import { useBack } from "@/lib/use-back"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { imageUrl } from "@/lib/images"
import { formatDateTime } from "@/lib/date"
import { status } from "@/lib/colors"
import { useRoutingStatus } from "@/features/ors"
import { useCompanyDetail } from "@/features/companies"
import type { CompanyMembership } from "@/features/auth"
import {
  useWaybill,
  useChangeWaybillStatus,
  useChangeParcelStatus,
  useWaybillStatusHistory,
  useParcelStatusHistory,
  useAssignWaybill,
  useCancelWaybill,
  EDITABLE_WAYBILL_STATUSES,
  PARCEL_STATUSES,
  WAYBILL_STATUSES,
  type AddressDto,
  type GoodsLineResponse,
  type ParcelStatus,
  type PlaceResponse,
  type WaybillPartyResponse,
  type WaybillPartyRole,
  type WaybillResponse,
  type WaybillStatus,
} from "@/features/waybills"
import { isBackwardStatusChange } from "@/lib/transport-types"

const ROLE_LABEL_KEY = {
  SHIPPER: "waybills.parties.shipper",
  CONSIGNEE: "waybills.parties.consignee",
  CARRIER: "waybills.parties.carrier",
} as const satisfies Record<WaybillPartyRole, string>

// Couleur du point sur la carte associée à chaque rôle (rappel visuel pour
// distinguer expéditeur/destinataire) : expéditeur = enlèvement (jaune),
// destinataire = livraison (vert). Transporteur : pas de point.
const ROLE_MARKER_COLOR: Partial<Record<WaybillPartyRole, string>> = {
  SHIPPER: status.transit.strong,
  CONSIGNEE: status.delivered.strong,
}

function formatAddress(address?: AddressDto | null): string {
  if (!address) return ""
  return [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ")
}

/**
 * Bloc unifié d'une extrémité du transport : l'entité (expéditeur /
 * destinataire / transporteur) et, le cas échéant, son lieu de prise en charge /
 * livraison (adresse + dates) dans la même carte, pour ne plus dissocier la
 * partie de son lieu.
 */
function PartyPlaceCard({
  role,
  party,
  place,
  placeTitle,
}: {
  role: WaybillPartyRole
  party?: WaybillPartyResponse | null
  place?: PlaceResponse | null
  placeTitle?: string
}) {
  const { t } = useTranslation()
  if (!party && !place) return null
  const partyAddress = formatAddress(party?.address)
  const placeAddress = formatAddress(place?.address)
  const contact = [party?.contactName, party?.contactPhone, party?.contactEmail]
    .filter(Boolean)
    .join(" · ")
  return (
    <div className="grid gap-1 rounded-lg border p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {ROLE_MARKER_COLOR[role] && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: ROLE_MARKER_COLOR[role] }}
            aria-hidden
          />
        )}
        {t(ROLE_LABEL_KEY[role])}
      </p>
      {party?.name && (
        <p className="text-sm font-medium text-neutral-900">{party.name}</p>
      )}
      {partyAddress && (
        <p className="text-sm text-muted-foreground">{partyAddress}</p>
      )}
      {contact && <p className="text-xs text-muted-foreground">{contact}</p>}

      {place && (
        <div className="mt-2 grid gap-1 border-t pt-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="size-3.5" />
            {placeTitle}
          </p>
          {placeAddress ? (
            <p className="text-sm text-neutral-900">{placeAddress}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("transport.address.none")}
            </p>
          )}
          {place.plannedAt && (
            <p className="text-xs text-muted-foreground">
              {t("waybills.places.plannedAt")}: {formatDateTime(place.plannedAt)}
            </p>
          )}
          {place.actualAt && (
            <p className="text-xs text-muted-foreground">
              {t("waybills.places.actualAt")}: {formatDateTime(place.actualAt)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// --- Dialogue de changement de statut ---------------------------------------

function StatusDialog({
  companyId,
  waybill,
  open,
  onOpenChange,
}: {
  companyId: string
  waybill: WaybillResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const mutation = useChangeWaybillStatus(companyId, waybill.id)
  const [target, setTarget] = useState<WaybillStatus | "">("")
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const backward = target
    ? isBackwardStatusChange(WAYBILL_STATUSES, waybill.status, target)
    : false

  const submit = async () => {
    if (!target) return
    try {
      await mutation.mutateAsync({
        status: target,
        failureReason: target === "FAILED" ? reason.trim() : undefined,
        note: note.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      /* affiché */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) {
          if (next) {
            setTarget("")
            setReason("")
            setNote("")
            mutation.reset()
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("waybills.statusDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("waybills.statusDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}

        <SelectField
          id="waybillTargetStatus"
          label={t("waybills.statusDialog.target")}
          value={target}
          onChange={(v) => setTarget(v as WaybillStatus)}
          options={WAYBILL_STATUSES.map((s) => ({
            value: s,
            label: t(`waybills.status.${s}`),
          }))}
          placeholder={t("waybills.statusDialog.choose")}
        />
        {backward && (
          <p className="rounded-md bg-[var(--status-transit-bg)] px-3 py-2 text-sm text-[var(--status-transit-text)]">
            {t("transport.statusBackward.warning")}
          </p>
        )}
        {target === "FAILED" && (
          <TextareaField
            id="waybillFailureReason"
            label={t("waybills.statusDialog.failureReason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        )}
        <TextareaField
          id="waybillStatusNote"
          label={t("transport.statusNote.label")}
          hint={t("transport.statusNote.hint")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={!target || (target === "FAILED" && !reason.trim())}
            onClick={submit}
          >
            {t("waybills.statusDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Dialogue de changement de statut d'un colis ----------------------------

function ParcelStatusDialog({
  companyId,
  waybillId,
  parcel,
  open,
  onOpenChange,
}: {
  companyId: string
  waybillId: string
  parcel: GoodsLineResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const mutation = useChangeParcelStatus(companyId, waybillId)
  const [target, setTarget] = useState<ParcelStatus | "">("")
  const [note, setNote] = useState("")
  const backward =
    parcel && target
      ? isBackwardStatusChange(PARCEL_STATUSES, parcel.status, target)
      : false

  const submit = async () => {
    if (!parcel || !target) return
    try {
      await mutation.mutateAsync({
        parcelId: parcel.id,
        input: { status: target, note: note.trim() || undefined },
      })
      onOpenChange(false)
    } catch {
      /* affiché */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) {
          if (next) {
            setTarget("")
            setNote("")
            mutation.reset()
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("waybills.parcelStatusDialog.title")}</DialogTitle>
          <DialogDescription>
            {parcel?.description ||
              t("waybills.parcelStatusDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}

        <SelectField
          id="parcelTargetStatus"
          label={t("waybills.statusDialog.target")}
          value={target}
          onChange={(v) => setTarget(v as ParcelStatus)}
          options={PARCEL_STATUSES.map((s) => ({
            value: s,
            label: t(`waybills.parcelStatus.${s}`),
          }))}
          placeholder={t("waybills.statusDialog.choose")}
        />
        {backward && (
          <p className="rounded-md bg-[var(--status-transit-bg)] px-3 py-2 text-sm text-[var(--status-transit-text)]">
            {t("transport.statusBackward.warning")}
          </p>
        )}
        <TextareaField
          id="parcelStatusNote"
          label={t("transport.statusNote.label")}
          hint={t("transport.statusNote.hint")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={!target}
            onClick={submit}
          >
            {t("waybills.statusDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Dialogue d'affectation --------------------------------------------------

function AssignDialog({
  companyId,
  waybill,
  open,
  onOpenChange,
}: {
  companyId: string
  waybill: WaybillResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const mutation = useAssignWaybill(companyId, waybill.id)
  const [tourId, setTourId] = useState<string | null>(waybill.tourId ?? null)
  const [assigneeId, setAssigneeId] = useState(waybill.assignedAccountId ?? "")

  const submit = async () => {
    try {
      await mutation.mutateAsync({
        tourId: tourId ?? null,
        assignedAccountId: assigneeId || null,
      })
      onOpenChange(false)
    } catch {
      /* affiché */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) {
          if (next) {
            setTourId(waybill.tourId ?? null)
            setAssigneeId(waybill.assignedAccountId ?? "")
            mutation.reset()
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("waybills.assignDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("waybills.assignDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}

        <TourCombobox
          companyId={companyId}
          id="assignTour"
          label={t("waybills.assignDialog.tour")}
          value={tourId}
          onSelect={(tour) => setTourId(tour?.id ?? null)}
        />
        <AssigneeSelect
          companyId={companyId}
          id="assignProfile"
          label={t("waybills.assignDialog.profile")}
          value={assigneeId}
          onChange={setAssigneeId}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Page --------------------------------------------------------------------

function WaybillDetail({
  company,
  waybillId,
}: {
  company: CompanyMembership
  waybillId: string
}) {
  const { t } = useTranslation()
  const back = useBack("/app/company/waybills")
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_TRANSPORTS)

  const waybillQuery = useWaybill(companyId, waybillId)
  const companyDetail = useCompanyDetail(companyId)
  const routingStatus = useRoutingStatus()
  const cancelWaybill = useCancelWaybill(companyId)

  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [statusParcel, setStatusParcel] = useState<GoodsLineResponse | null>(
    null,
  )
  const [historyParcel, setHistoryParcel] = useState<GoodsLineResponse | null>(
    null,
  )

  const historyQuery = useWaybillStatusHistory(companyId, waybillId, historyOpen)
  const parcelHistoryQuery = useParcelStatusHistory(
    companyId,
    waybillId,
    historyParcel?.id ?? "",
    Boolean(historyParcel),
  )

  if (waybillQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }
  if (waybillQuery.isError || !waybillQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(waybillQuery.error)}</AlertDescription>
      </Alert>
    )
  }

  const waybill = waybillQuery.data
  const canEdit = EDITABLE_WAYBILL_STATUSES.includes(waybill.status)
  const routingUnavailable = routingStatus.data?.ready === false
  const proofUrl = imageUrl(waybill.proofOfDeliveryImageUrl ?? undefined)

  // Points GPS à toujours afficher : expéditeur (prise en charge) et
  // destinataire (livraison). On retombe sur les lieux si la partie n'a pas de
  // coordonnées propres.
  const pickupLocation =
    waybill.placeOfTakingOver?.location ?? waybill.shipper?.location ?? null
  const deliveryLocation =
    waybill.placeOfDelivery?.location ?? waybill.consignee?.location ?? null
  const pickupAddress = formatAddress(
    waybill.placeOfTakingOver?.address ?? waybill.shipper?.address,
  )
  const deliveryAddress = formatAddress(
    waybill.placeOfDelivery?.address ?? waybill.consignee?.address,
  )
  const depotLocation = companyDetail.data?.depositAddress?.coordinate ?? null
  const mapMarkers = [
    depotLocation
      ? {
          latitude: depotLocation.latitude,
          longitude: depotLocation.longitude,
          tone: "depot" as const,
          title: companyDetail.data?.name ?? t("waybills.route.depot"),
        }
      : null,
    pickupLocation
      ? {
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
          tone: "pickup" as const,
          title: `${t("waybills.parties.shipper")} · ${
            waybill.shipper?.name ?? t("waybills.fields.shipper")
          }`,
          description: pickupAddress || undefined,
        }
      : null,
    deliveryLocation
      ? {
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
          tone: "delivery" as const,
          title: `${t("waybills.parties.consignee")} · ${
            waybill.consignee?.name ?? t("waybills.fields.consignee")
          }`,
          description: deliveryAddress || undefined,
        }
      : null,
  ].filter((m): m is NonNullable<typeof m> => m !== null)

  const confirmCancel = async () => {
    try {
      await cancelWaybill.mutateAsync(waybill.id)
      setCancelOpen(false)
    } catch {
      /* affiché */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={back}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("waybills.backToList")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {waybill.reference}
            </h1>
            <WaybillStatusBadge status={waybill.status} />
            <DockDwellBadge
              status={waybill.status}
              dockEnteredAt={waybill.dockEnteredAt}
              dockExitedAt={waybill.dockExitedAt}
            />
            <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">
              {t(`waybills.scope.${waybill.scope}`)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("waybills.detail.created")}: {formatDateTime(waybill.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setHistoryOpen(true)}>
            <History />
            {t("transport.history.action")}
          </Button>
          {canManage && (
            <>
              <Button variant="outline" onClick={() => setStatusOpen(true)}>
                <RefreshCw />
                {t("waybills.actions.changeStatus")}
              </Button>
              {canEdit && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  {t("common.edit")}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t("waybills.actions.more")}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                    <Truck />
                    {t("waybills.actions.assign")}
                  </DropdownMenuItem>
                  {waybill.status !== "CANCELLED" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setCancelOpen(true)}
                      >
                        <X />
                        {t("waybills.actions.cancel")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {waybill.failureReason && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("waybills.detail.failureReason")}: {waybill.failureReason}
          </AlertDescription>
        </Alert>
      )}

      {waybill.clientName && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 grow">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("waybills.client.title")}
              </p>
              <p className="truncate text-lg font-semibold text-neutral-900">
                {waybill.clientName}
              </p>
            </div>
            {waybill.clientId && (
              <Button asChild variant="outline" className="shrink-0">
                <Link to={`/app/company/clients/${waybill.clientId}`}>
                  {t("waybills.client.view")}
                  <ChevronRight />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <PartyPlaceCard
          role="SHIPPER"
          party={waybill.shipper}
          place={waybill.placeOfTakingOver}
          placeTitle={t("waybills.places.takingOver")}
        />
        <PartyPlaceCard
          role="CONSIGNEE"
          party={waybill.consignee}
          place={waybill.placeOfDelivery}
          placeTitle={t("waybills.places.delivery")}
        />
      </div>

      {waybill.carrier && (
        <div className="grid gap-3 sm:grid-cols-2">
          <PartyPlaceCard role="CARRIER" party={waybill.carrier} />
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">
            {t("waybills.detail.route")}
          </h2>
          <RouteMap
            polyline={waybill.route?.geometryPolyline}
            distanceMeters={waybill.route?.distanceMeters}
            durationSeconds={waybill.route?.durationSeconds}
            unavailable={
              routingUnavailable &&
              !waybill.route?.geometryPolyline &&
              mapMarkers.length === 0
            }
            markers={mapMarkers}
            className="h-72"
          />
          {!waybill.route?.geometryPolyline && mapMarkers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("waybills.detail.routeHint")}
            </p>
          )}
        </CardContent>
      </Card>

      {waybill.goodsLines.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("waybills.goods.title")}
            </h2>
            <div className="flex flex-col gap-2">
              {waybill.goodsLines.map((line) => {
                return (
                  <div
                    key={line.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border p-3 text-sm"
                  >
                    <span className="min-w-0 grow font-medium text-neutral-900">
                      {line.description}
                    </span>
                    <ParcelStatusBadge status={line.status} />
                    <DockDwellBadge
                      status={line.status}
                      dockEnteredAt={line.dockEnteredAt}
                      dockExitedAt={line.dockExitedAt}
                    />
                    {line.numberOfPackages != null && (
                      <span className="text-xs text-muted-foreground">
                        {t("waybills.goods.numberOfPackages")}:{" "}
                        {line.numberOfPackages}
                      </span>
                    )}
                    {line.grossWeightKg != null && (
                      <span className="text-xs text-muted-foreground">
                        {line.grossWeightKg} kg
                      </span>
                    )}
                    {line.volumeM3 != null && (
                      <span className="text-xs text-muted-foreground">
                        {line.volumeM3} m³
                      </span>
                    )}
                    {(line.lengthCm != null ||
                      line.widthCm != null ||
                      line.heightCm != null) && (
                      <span className="text-xs text-muted-foreground">
                        {t("waybills.goods.dimensions")}:{" "}
                        {[line.lengthCm, line.widthCm, line.heightCm]
                          .map((d) => (d != null ? d : "-"))
                          .join(" x ")}{" "}
                        cm
                      </span>
                    )}
                    {line.dangerousGoods && (
                      <span className="rounded-full bg-[var(--status-failed-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-failed-text)]">
                        {t("waybills.goods.dangerousGoods")}
                        {line.unNumber ? ` · ${line.unNumber}` : ""}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground"
                          aria-label={t("waybills.parcel.actions")}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {canManage && (
                          <DropdownMenuItem
                            onClick={() => setStatusParcel(line)}
                          >
                            <RefreshCw />
                            {t("waybills.parcel.changeStatus")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setHistoryParcel(line)}>
                          <History />
                          {t("transport.history.action")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <WaybillPricingCard
        companyId={companyId}
        waybillId={waybill.id}
        status={waybill.status}
        amount={waybill.carriageChargesAmount}
        currency={waybill.carriageChargesCurrency}
        canManage={canManage}
      />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">
            {t("waybills.detail.signatures")}
          </h2>
          {waybill.signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("waybills.detail.noSignatures")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {waybill.signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border p-3 text-sm"
                >
                  <span className="font-medium text-neutral-900">
                    {sig.signerName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(ROLE_LABEL_KEY[sig.role])} ·{" "}
                    {t(`waybills.signatureMethod.${sig.method}`)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(sig.signedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {proofUrl && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("waybills.detail.proofOfDelivery")}
            </h2>
            <img
              src={proofUrl}
              alt={t("waybills.detail.proofOfDelivery")}
              className="max-h-80 w-fit rounded-md border object-contain"
            />
          </CardContent>
        </Card>
      )}

      {(waybill.tourId ||
        waybill.assigneeName ||
        waybill.notes ||
        waybill.senderInstructions) && (
        <Card>
          <CardContent className="flex flex-col gap-2 text-sm">
            {waybill.assigneeName && (
              <p>
                <span className="text-muted-foreground">
                  {t("waybills.assignDialog.profile")}:{" "}
                </span>
                {waybill.assigneeName}
              </p>
            )}
            {waybill.senderInstructions && (
              <p>
                <span className="text-muted-foreground">
                  {t("waybills.cmr.senderInstructions")}:{" "}
                </span>
                {waybill.senderInstructions}
              </p>
            )}
            {waybill.notes && (
              <p>
                <span className="text-muted-foreground">
                  {t("waybills.fields.notes")}:{" "}
                </span>
                {waybill.notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <WaybillFormDialog
        companyId={companyId}
        open={editOpen}
        waybill={waybill}
        onOpenChange={setEditOpen}
      />
      <StatusDialog
        companyId={companyId}
        waybill={waybill}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <ParcelStatusDialog
        companyId={companyId}
        waybillId={waybillId}
        parcel={statusParcel}
        open={statusParcel !== null}
        onOpenChange={(next) => {
          if (!next) setStatusParcel(null)
        }}
      />
      <StatusHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={t("waybills.history.title")}
        query={historyQuery}
        statusLabel={(s) => t(`waybills.status.${s}` as ParseKeys)}
      />
      <StatusHistoryDialog
        open={historyParcel !== null}
        onOpenChange={(next) => {
          if (!next) setHistoryParcel(null)
        }}
        title={t("waybills.parcelHistory.title")}
        description={historyParcel?.description ?? undefined}
        query={parcelHistoryQuery}
        statusLabel={(s) => t(`waybills.parcelStatus.${s}` as ParseKeys)}
      />
      <AssignDialog
        companyId={companyId}
        waybill={waybill}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />

      <Dialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (!cancelWaybill.isPending) setCancelOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("waybills.cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("waybills.cancelDialog.body", { reference: waybill.reference })}
            </DialogDescription>
          </DialogHeader>
          {cancelWaybill.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(cancelWaybill.error)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelWaybill.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={cancelWaybill.isPending}
              onClick={confirmCancel}
            >
              {t("waybills.actions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function WaybillDetailPage() {
  const { waybillId } = useParams<{ waybillId: string }>()
  return (
    <CompanyShell showHeader={false}>
      {(company) =>
        waybillId ? (
          <WaybillDetail company={company} waybillId={waybillId} />
        ) : null
      }
    </CompanyShell>
  )
}
