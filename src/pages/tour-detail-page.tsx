import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ParseKeys } from "i18next"
import {
  ArrowLeft,
  GripVertical,
  History,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { VehicleSelect, AssigneeSelect } from "@/components/transport-selects"
import { SelectField } from "@/components/select-field"
import { TextareaField } from "@/components/textarea-field"
import { QuickStopDialog } from "@/components/quick-stop-dialog"
import { RoutePlannerMap, type RoutePlannerPoint } from "@/features/map"
import {
  TourStatusBadge,
  WaybillStatusBadge,
} from "@/components/transport-status-badge"
import { StatusHistoryDialog } from "@/components/status-history-dialog"
import { TourFormDialog } from "@/components/tour-form-dialog"
import { getErrorMessage } from "@/lib/api-error"
import { useBack } from "@/lib/use-back"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { formatCivilDate } from "@/lib/date"
import { useQuery } from "@tanstack/react-query"
import { useRoutingStatus } from "@/features/ors"
import type { CompanyMembership } from "@/features/auth"
import {
  waybillsApi,
  waybillKeys,
  type WaybillSummaryResponse,
} from "@/features/waybills"
import {
  useTour,
  useAssignTour,
  useSetTourWaybills,
  useOptimizeTour,
  useTourRoutePreview,
  useSaveTourRoute,
  useChangeTourStatus,
  useTourStatusHistory,
  useCancelTour,
  TERMINAL_TOUR_STATUSES,
  TOUR_STATUSES,
  type RoutePreviewResponse,
  type SkippedVisit,
  type TourResponse,
  type TourStatus,
} from "@/features/tours"
import { isBackwardStatusChange } from "@/lib/transport-types"

// --- Dialogue d'ajout d'arrêts ----------------------------------------------

function AddWaybillsDialog({
  companyId,
  tourId,
  currentIds,
  open,
  onOpenChange,
}: {
  companyId: string
  tourId: string
  currentIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const setWaybills = useSetTourWaybills(companyId, tourId)
  const [search, setSearch] = useState("")
  const debounced = useDebouncedValue(search.trim(), 300)

  const params = { q: debounced || undefined, size: 20, sort: "createdAt,desc" }
  const query = useQuery({
    queryKey: [...waybillKeys.lists(companyId), "picker", params],
    queryFn: () => waybillsApi.list(companyId, params),
    enabled: Boolean(companyId) && open,
  })

  const results = query.data?.content ?? []
  const currentSet = new Set(currentIds)

  const add = (waybill: WaybillSummaryResponse) => {
    if (currentSet.has(waybill.id)) return
    setWaybills.mutate({ waybillIds: [...currentIds, waybill.id] })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!setWaybills.isPending) {
          if (next) {
            setSearch("")
            setWaybills.reset()
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("tours.addWaybills.title")}</DialogTitle>
          <DialogDescription>
            {t("tours.addWaybills.description")}
          </DialogDescription>
        </DialogHeader>

        {setWaybills.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(setWaybills.error)}
            </AlertDescription>
          </Alert>
        )}

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("tours.addWaybills.searchPlaceholder")}
          aria-label={t("tours.addWaybills.searchPlaceholder")}
        />

        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {query.isFetching && results.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : results.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">
              {t("tours.addWaybills.noResults")}
            </p>
          ) : (
            results.map((waybill) => {
              const added = currentSet.has(waybill.id)
              return (
                <div
                  key={waybill.id}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {waybill.reference}
                      </span>
                      <WaybillStatusBadge status={waybill.status} />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {waybill.consigneeName || ""}
                      {waybill.deliveryCity ? ` · ${waybill.deliveryCity}` : ""}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={added ? "ghost" : "outline"}
                    disabled={added || setWaybills.isPending}
                    onClick={() => add(waybill)}
                  >
                    {added ? t("tours.addWaybills.added") : t("tours.addWaybills.add")}
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Dialogue de changement de statut ---------------------------------------

function TourStatusDialog({
  companyId,
  tour,
  open,
  onOpenChange,
}: {
  companyId: string
  tour: TourResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const mutation = useChangeTourStatus(companyId, tour.id)
  const [target, setTarget] = useState<TourStatus | "">("")
  const [note, setNote] = useState("")
  const backward = target
    ? isBackwardStatusChange(TOUR_STATUSES, tour.status, target)
    : false

  const submit = async () => {
    if (!target) return
    try {
      await mutation.mutateAsync({
        status: target,
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
            setNote("")
            mutation.reset()
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tours.statusDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("tours.statusDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}

        <SelectField
          id="tourTargetStatus"
          label={t("tours.statusDialog.target")}
          value={target}
          onChange={(v) => setTarget(v as TourStatus)}
          options={TOUR_STATUSES.map((s) => ({
            value: s,
            label: t(`tours.status.${s}`),
          }))}
          placeholder={t("tours.statusDialog.choose")}
        />
        {backward && (
          <p className="rounded-md bg-[var(--status-transit-bg)] px-3 py-2 text-sm text-[var(--status-transit-text)]">
            {t("transport.statusBackward.warning")}
          </p>
        )}
        <TextareaField
          id="tourStatusNote"
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
          <Button loading={mutation.isPending} disabled={!target} onClick={submit}>
            {t("tours.statusDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Dialogue d'affectation --------------------------------------------------

function TourAssignDialog({
  companyId,
  tour,
  open,
  onOpenChange,
}: {
  companyId: string
  tour: TourResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const mutation = useAssignTour(companyId, tour.id)
  const [vehicleId, setVehicleId] = useState(tour.vehicleId ?? "")
  const [assigneeId, setAssigneeId] = useState(tour.assignedAccountId ?? "")

  const submit = async () => {
    try {
      await mutation.mutateAsync({
        vehicleId: vehicleId || null,
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
            setVehicleId(tour.vehicleId ?? "")
            setAssigneeId(tour.assignedAccountId ?? "")
            mutation.reset()
          }
          onOpenChange(next)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tours.assignDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("tours.assignDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        )}

        <VehicleSelect
          companyId={companyId}
          id="tourAssignVehicle"
          label={t("tours.fields.vehicle")}
          value={vehicleId}
          onChange={setVehicleId}
        />
        <AssigneeSelect
          companyId={companyId}
          id="tourAssignProfile"
          label={t("tours.fields.driver")}
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

function TourDetail({
  company,
  tourId,
}: {
  company: CompanyMembership
  tourId: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const back = useBack("/app/company/tours")
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_TRANSPORTS)

  const tourQuery = useTour(companyId, tourId)
  const routingStatus = useRoutingStatus()
  const setWaybills = useSetTourWaybills(companyId, tourId)
  const optimizeTour = useOptimizeTour(companyId, tourId)
  const previewRoute = useTourRoutePreview(companyId, tourId)
  const saveRoute = useSaveTourRoute(companyId, tourId)
  const cancelTour = useCancelTour(companyId)

  const [order, setOrder] = useState<string[]>([])
  const [preview, setPreview] = useState<RoutePreviewResponse | null>(null)
  const [skipped, setSkipped] = useState<SkippedVisit[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [quickStopOpen, setQuickStopOpen] = useState(false)
  const [quickStopCoord, setQuickStopCoord] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const dragIndex = useRef<number | null>(null)

  const historyQuery = useTourStatusHistory(companyId, tourId, historyOpen)

  const tour = tourQuery.data
  const persistedOrder = (tour?.waybills ?? []).map((w) => w.id).join(",")

  // (Re)synchronise l'ordre local quand la tournée persistée change.
  useEffect(() => {
    setOrder(persistedOrder ? persistedOrder.split(",") : [])
    setPreview(null)
  }, [persistedOrder])

  const dirty = order.join(",") !== persistedOrder

  // Preview temps réel (debounce ~300 ms) à chaque changement d'ordre.
  useEffect(() => {
    if (!dirty || order.length < 2) {
      setPreview(null)
      return
    }
    const id = setTimeout(() => {
      previewRoute.mutate(
        { waybillIds: order },
        { onSuccess: (data) => setPreview(data) },
      )
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, dirty])

  if (tourQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }
  if (tourQuery.isError || !tour) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{getErrorMessage(tourQuery.error)}</AlertDescription>
      </Alert>
    )
  }

  const isTerminal = TERMINAL_TOUR_STATUSES.includes(tour.status)
  const editable = canManage && !isTerminal
  const stopsById = new Map(tour.waybills.map((w) => [w.id, w]))
  const routingUnavailable = routingStatus.data?.ready === false

  const reorder = (from: number, to: number) => {
    if (from === to) return
    setOrder((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const removeStop = (waybillId: string) => {
    setWaybills.mutate({ waybillIds: order.filter((id) => id !== waybillId) })
  }

  const onOptimize = async () => {
    setSkipped([])
    try {
      const result = await optimizeTour.mutateAsync()
      setSkipped(result.skippedVisits ?? [])
    } catch {
      /* affiché */
    }
  }

  const onSaveOrder = () => saveRoute.mutate({ waybillIds: order })
  const resetOrder = () => {
    setOrder(persistedOrder ? persistedOrder.split(",") : [])
    setPreview(null)
  }

  const confirmCancel = async () => {
    try {
      await cancelTour.mutateAsync(tour.id)
      setCancelOpen(false)
    } catch {
      /* affiché */
    }
  }

  // Géométrie/métriques affichées : preview prioritaire, sinon trajet persisté.
  const geometry = preview?.geometryPolyline ?? tour.route?.geometryPolyline
  const distanceMeters = preview?.distanceMeters ?? tour.route?.distanceMeters
  const durationSeconds = preview?.durationSeconds ?? tour.route?.durationSeconds
  const depotPoint = tour.depotLocation
    ? {
        latitude: tour.depotLocation.latitude,
        longitude: tour.depotLocation.longitude,
        title: t("tours.fields.depot"),
      }
    : null
  // Repères des arrêts (coordonnées de livraison des lettres), dans l'ordre.
  const stopMarkers: RoutePlannerPoint[] = []
  order.forEach((id, index) => {
    const stop = stopsById.get(id)
    if (
      !stop ||
      typeof stop.deliveryLatitude !== "number" ||
      typeof stop.deliveryLongitude !== "number"
    )
      return
    stopMarkers.push({
      id,
      latitude: stop.deliveryLatitude,
      longitude: stop.deliveryLongitude,
      index: index + 1,
      title: stop.reference,
    })
  })

  const openQuickStop = (coord: { latitude: number; longitude: number } | null) => {
    setQuickStopCoord(coord)
    setQuickStopOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={back}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("tours.backToList")}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {tour.name}
            </h1>
            <TourStatusBadge status={tour.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {tour.reference}
            {tour.plannedDate ? ` · ${formatCivilDate(tour.plannedDate)}` : ""}
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
                {t("tours.actions.changeStatus")}
              </Button>
              {editable && (
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
                    aria-label={t("tours.actions.more")}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                    <Truck />
                    {t("tours.actions.assign")}
                  </DropdownMenuItem>
                  {tour.status !== "CANCELLED" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setCancelOpen(true)}
                      >
                        <X />
                        {t("tours.actions.cancel")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {(saveRoute.isError || optimizeTour.isError || setWaybills.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(
              saveRoute.error ?? optimizeTour.error ?? setWaybills.error,
            )}
          </AlertDescription>
        </Alert>
      )}

      {skipped.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-medium">{t("tours.skipped.title")}</p>
            <ul className="mt-1 list-disc pl-4">
              {skipped.map((s) => (
                <li key={s.visitId}>
                  {s.name || s.visitId} · {t(`tours.skipped.reason.${s.reason}`)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1 rounded-lg border p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="size-3.5" />
            {t("tours.fields.depot")}
          </p>
          <p className="text-sm text-neutral-900">
            {[tour.depot?.line1, tour.depot?.city].filter(Boolean).join(", ") ||
              t("transport.address.none")}
          </p>
        </div>
        <div className="grid gap-1 rounded-lg border p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Truck className="size-3.5" />
            {t("tours.fields.vehicle")}
          </p>
          <p className="text-sm text-neutral-900">
            {tour.vehicleId ? t("tours.detail.assigned") : t("transport.assign.noVehicle")}
          </p>
        </div>
        <div className="grid gap-1 rounded-lg border p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <User className="size-3.5" />
            {t("tours.fields.driver")}
          </p>
          <p className="text-sm text-neutral-900">
            {tour.assigneeName || t("transport.assign.noProfile")}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">
              {t("tours.detail.route")}
            </h2>
            {editable && (
              <Button variant="outline" size="sm" onClick={() => openQuickStop(null)}>
                <Plus />
                {t("tours.actions.addStopOnMap")}
              </Button>
            )}
          </div>
          {routingUnavailable && (
            <Alert>
              <AlertDescription>
                {t("transport.routing.unavailable")}
              </AlertDescription>
            </Alert>
          )}
          <RoutePlannerMap
            points={stopMarkers}
            depot={depotPoint}
            polyline={geometry}
            distanceMeters={distanceMeters}
            durationSeconds={durationSeconds}
            onAddPoint={editable ? openQuickStop : undefined}
            onSelectPoint={(id) => navigate(`/app/company/waybills/${id}`)}
            hint={editable ? t("tours.detail.addStopHint") : undefined}
            loading={previewRoute.isPending || saveRoute.isPending || optimizeTour.isPending}
            className="h-80"
          />
          {dirty && (
            <p className="text-xs text-muted-foreground">
              {t("tours.detail.previewHint")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">
              {t("tours.detail.stops")} ({order.length})
            </h2>
            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOptimize}
                  loading={optimizeTour.isPending}
                  disabled={order.length < 2}
                >
                  <Sparkles />
                  {t("tours.actions.optimize")}
                </Button>
                {dirty && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetOrder}
                      disabled={saveRoute.isPending}
                    >
                      <RotateCcw />
                      {t("tours.actions.resetOrder")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={onSaveOrder}
                      loading={saveRoute.isPending}
                    >
                      <Save />
                      {t("tours.actions.saveOrder")}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus />
                  {t("tours.actions.addWaybills")}
                </Button>
              </div>
            )}
          </div>

          {order.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("tours.detail.noStops")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {order.map((id, index) => {
                const stop = stopsById.get(id)
                if (!stop) return null
                return (
                  <li
                    key={id}
                    draggable={editable}
                    onDragStart={() => {
                      dragIndex.current = index
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (dragIndex.current !== null) {
                        reorder(dragIndex.current, index)
                        dragIndex.current = null
                      }
                    }}
                    className="flex items-center gap-3 rounded-md border bg-card p-3"
                  >
                    {editable && (
                      <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                    )}
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => navigate(`/app/company/waybills/${id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-neutral-900">
                          {stop.reference}
                        </span>
                        <WaybillStatusBadge status={stop.status} />
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {stop.consigneeName || ""}
                        {stop.deliveryCity ? ` · ${stop.deliveryCity}` : ""}
                      </span>
                    </span>
                    {editable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground"
                        aria-label={t("tours.detail.removeStop")}
                        disabled={setWaybills.isPending}
                        onClick={() => removeStop(id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {tour.notes && (
        <Card>
          <CardContent className="text-sm">
            <span className="text-muted-foreground">
              {t("tours.fields.notes")}:{" "}
            </span>
            {tour.notes}
          </CardContent>
        </Card>
      )}

      <TourStatusDialog
        companyId={companyId}
        tour={tour}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <StatusHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={t("tours.history.title")}
        query={historyQuery}
        statusLabel={(s) => t(`tours.status.${s}` as ParseKeys)}
      />
      <TourFormDialog
        companyId={companyId}
        open={editOpen}
        tour={tour}
        onOpenChange={setEditOpen}
      />
      <TourAssignDialog
        companyId={companyId}
        tour={tour}
        open={assignOpen}
        onOpenChange={setAssignOpen}
      />
      <AddWaybillsDialog
        companyId={companyId}
        tourId={tourId}
        currentIds={order}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <QuickStopDialog
        companyId={companyId}
        tourId={tourId}
        open={quickStopOpen}
        onOpenChange={setQuickStopOpen}
        initialCoord={quickStopCoord}
      />

      <Dialog
        open={cancelOpen}
        onOpenChange={(next) => {
          if (!cancelTour.isPending) setCancelOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tours.cancelDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("tours.cancelDialog.body", { name: tour.name })}
            </DialogDescription>
          </DialogHeader>
          {cancelTour.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(cancelTour.error)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelTour.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={cancelTour.isPending}
              onClick={confirmCancel}
            >
              {t("tours.actions.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TourDetailPage() {
  const { tourId } = useParams<{ tourId: string }>()
  return (
    <CompanyShell showHeader={false}>
      {(company) =>
        tourId ? <TourDetail company={company} tourId={tourId} /> : null
      }
    </CompanyShell>
  )
}
