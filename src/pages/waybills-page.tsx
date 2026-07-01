import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  ChevronDown,
  ChevronUp,
  ListChecks,
  MapPin,
  MapPinOff,
  Package,
  Plus,
  RotateCcw,
  Search,
  Tag,
  X,
} from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { WaybillStatusBadge } from "@/components/transport-status-badge"
import { DockDwellBadge } from "@/components/dock-dwell"
import { waybillStatusColor } from "@/components/transport-status-tones"
import { WaybillFormDialog } from "@/components/waybill-form-dialog"
import { PointsMap, type MapLink, type MapMarker } from "@/features/map"
import { getErrorMessage } from "@/lib/api-error"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import {
  dateInputToEndInstant,
  dateInputToStartInstant,
  formatCivilDate,
  formatDateTime,
  toDateInputValue,
} from "@/lib/date"
import { cn } from "@/lib/utils"
import { useBack } from "@/lib/use-back"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { CompanyMembership } from "@/features/auth"
import { useCompanyDetail } from "@/features/companies"
import {
  useBulkArchiveWaybills,
  useBulkCancelWaybills,
  useBulkWaybillStatus,
  useInfiniteWaybills,
  WAYBILL_STATUSES,
  type BulkResultResponse,
  type WaybillDateField,
  type WaybillStatus,
  type WaybillSummaryResponse,
} from "@/features/waybills"

const PAGE_SIZE = 50

type DisplayMode = "PICKUP" | "DELIVERY" | "BOTH"
type ViewMode = "list" | "map"
type ArchivedFilter = "active" | "archived" | "all"

/** Statuts proposés en changement groupé (FAILED exige un motif, CANCELLED a son action dédiée). */
const BULK_STATUS_TARGETS: WaybillStatus[] = [
  "ISSUED",
  "COLLECTED",
  "IN_TRANSIT",
  "DELIVERED",
]

interface SegmentedOption<T extends string> {
  value: T
  label: string
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
  ariaLabel?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 rounded-md border bg-muted/40 p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded px-2.5 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === o.value
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Décale une date « YYYY-MM-DD » (jour local) de `offset` jours. */
function shiftDateInput(value: string, offset: number): string {
  const [y, m, d] = value.split("-").map(Number)
  return toDateInputValue(new Date(y, m - 1, d + offset))
}

interface WaybillRowProps {
  waybill: WaybillSummaryResponse
  index: number
  dateField: WaybillDateField
  located: boolean
  hovered: boolean
  selectable: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onHover: (id: string | null) => void
  onOpen: (waybill: WaybillSummaryResponse) => void
}

function WaybillRow({
  waybill,
  index,
  dateField,
  located,
  hovered,
  selectable,
  selected,
  onToggleSelect,
  onHover,
  onOpen,
}: WaybillRowProps) {
  const { t } = useTranslation()
  const city =
    dateField === "PICKUP" ? waybill.pickupCity : waybill.deliveryCity
  const planned =
    dateField === "PICKUP"
      ? waybill.pickupPlannedAt
      : waybill.deliveryPlannedAt

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(waybill)}
      onMouseEnter={() => onHover(waybill.id)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(waybill)
        }
      }}
      className={cn(
        "flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        hovered && "border-ring bg-accent/50",
        selected && "border-primary bg-primary/5",
      )}
    >
      {selectable ? (
        <span
          className="flex size-6 shrink-0 items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(waybill.id)}
            aria-label={waybill.reference}
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
        >
          {index}
        </span>
      )}

      <div className="min-w-0 grow basis-48">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">
            {waybill.reference}
          </p>
          <WaybillStatusBadge status={waybill.status} />
          <DockDwellBadge
            status={waybill.status}
            dockEnteredAt={waybill.dockEnteredAt}
            dockExitedAt={waybill.dockExitedAt}
          />
          {waybill.archived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Archive className="size-3" />
              {t("waybills.archivedBadge")}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {waybill.shipperName || t("waybills.fields.shipper")}
          {" → "}
          {waybill.consigneeName || t("waybills.fields.consignee")}
        </p>
        {waybill.clientName && (
          <p className="truncate text-xs text-muted-foreground">
            {t("waybills.client.label")}: {waybill.clientName}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
        {city && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {city}
          </span>
        )}
        {planned && <span>{formatCivilDate(planned.slice(0, 10))}</span>}
        {!located && (
          <span className="flex items-center gap-1 text-amber-600">
            <MapPinOff className="size-3.5" />
            {t("waybills.map.notLocated")}
          </span>
        )}
      </div>
    </div>
  )
}

export function WaybillsList({
  company,
  clientId,
}: {
  company: CompanyMembership
  /** Si fourni, la liste est filtrée sur ce donneur d'ordre et affiche un
   * en-tête « retour client + nom » (page « Lettres de voiture d'un client »). */
  clientId?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_TRANSPORTS)
  const companyDetail = useCompanyDetail(companyId)
  const depot = companyDetail.data?.depositAddress?.coordinate ?? null

  // Variante « scopée client » : bouton retour au-dessus des filtres.
  const scoped = Boolean(clientId)
  const back = useBack(
    clientId ? `/app/company/clients/${clientId}` : "/app/company/waybills",
  )

  const today = toDateInputValue(new Date())

  // Les filtres sont reflétés dans l'URL (query string) : ils survivent ainsi à
  // un aller-retour vers le détail d'une lettre (bouton « retour ») et restent
  // partageables. État initial lu depuis l'URL, puis synchronisé en `replace`.
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")
  const [statuses, setStatuses] = useState<WaybillStatus[]>(
    () => searchParams.getAll("status") as WaybillStatus[],
  )
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>(
    () => (searchParams.get("archived") as ArchivedFilter) || "active",
  )
  const [selectedDate, setSelectedDate] = useState(
    () => searchParams.get("date") || today,
  )
  const [view, setView] = useState<ViewMode>(
    () => (searchParams.get("view") as ViewMode) || "list",
  )

  const sort = "pickupPlannedAt,asc"
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const dateField: WaybillDateField = "PICKUP"

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkResult, setBulkResult] = useState<BulkResultResponse | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const displayMode = "PICKUP" as DisplayMode
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Reflète l'état des filtres dans l'URL (sans empiler d'entrée d'historique).
  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedSearch) next.set("q", debouncedSearch)
    statuses.forEach((s) => next.append("status", s))
    if (archivedFilter !== "active") next.set("archived", archivedFilter)
    if (selectedDate && selectedDate !== today) next.set("date", selectedDate)
    if (view !== "list") next.set("view", view)
    setSearchParams(next, { replace: true })
    // `today`/`setSearchParams` stables ; on ne resynchronise que sur les filtres.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statuses, archivedFilter, selectedDate, view])

  // La carte (Mapbox, lourd) n'est montée que lorsqu'elle est réellement
  // visible : toujours en desktop (split), à la demande en mobile (onglet
  // Carte). Évite d'initialiser une carte dans un conteneur masqué (fitBounds
  // sur 0x0) et de charger Mapbox pour rien sur la vue Liste mobile.
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  )
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const handler = () => setIsDesktop(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const [formOpen, setFormOpen] = useState(false)

  const dateFrom = selectedDate ? dateInputToStartInstant(selectedDate) : null
  const dateTo = selectedDate ? dateInputToEndInstant(selectedDate) : null
  const dateFiltered = Boolean(dateFrom || dateTo)
  const archivedParam =
    archivedFilter === "active"
      ? undefined
      : archivedFilter === "archived"
        ? true
        : "all"

  const waybills = useInfiniteWaybills(companyId, {
    clientId: clientId || undefined,
    // Sans `status`, l'API du filtre `clientId` ne renvoie QUE les brouillons :
    // pour « tous les statuts » on envoie alors explicitement les 7 valeurs.
    status: statuses.length
      ? statuses
      : scoped
        ? WAYBILL_STATUSES
        : undefined,
    q: debouncedSearch || undefined,
    archived: archivedParam,
    dateField: dateFiltered ? dateField : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    size: PAGE_SIZE,
    sort,
  })
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = waybills

  const rows = waybills.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = waybills.data?.pages[0]?.totalElements ?? rows.length
  const hasRows = rows.length > 0

  const bulkStatus = useBulkWaybillStatus(companyId)
  const bulkArchive = useBulkArchiveWaybills(companyId)
  const bulkCancel = useBulkCancelWaybills(companyId)
  const bulkPending =
    bulkStatus.isPending || bulkArchive.isPending || bulkCancel.isPending

  const selectedIds = rows.filter((w) => selected.has(w.id)).map((w) => w.id)
  const selectedCount = selectedIds.length
  const allLoadedSelected = hasRows && rows.every((w) => selected.has(w.id))

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSelectAll = () =>
    setSelected(allLoadedSelected ? new Set() : new Set(rows.map((w) => w.id)))

  const clearSelection = () => setSelected(new Set())

  const onBulkDone = (res: BulkResultResponse) => {
    setBulkResult(res)
    clearSelection()
  }

  const runBulkStatus = (status: WaybillStatus) => {
    if (!selectedCount) return
    bulkStatus.mutate(
      { ids: selectedIds, status },
      { onSuccess: onBulkDone },
    )
  }

  const runBulkArchive = (archived: boolean) => {
    if (!selectedCount) return
    bulkArchive.mutate(
      { ids: selectedIds, archived },
      { onSuccess: onBulkDone },
    )
  }

  const runBulkCancel = () => {
    if (!selectedCount) return
    bulkCancel.mutate(
      { ids: selectedIds },
      {
        onSuccess: (res) => {
          onBulkDone(res)
          setCancelOpen(false)
        },
      },
    )
  }

  // Carte : charger toutes les pages du jeu filtré par date (borné) pour ne pas
  // afficher qu'une fraction des points. Hors filtre date, on s'en tient au
  // scroll infini de la liste (jeu potentiellement très large).
  useEffect(() => {
    if (dateFiltered && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [dateFiltered, hasNextPage, isFetchingNextPage, fetchNextPage, rows.length])

  const markers: MapMarker[] = []
  const links: MapLink[] = []
  if (depot) {
    markers.push({
      id: "depot",
      latitude: depot.latitude,
      longitude: depot.longitude,
      tone: "depot",
      interactive: false,
      title: companyDetail.data?.name ?? t("waybills.route.depot"),
    })
  }
  rows.forEach((w, i) => {
    const color = waybillStatusColor(w.status)
    const hasPickup = w.pickupLatitude != null && w.pickupLongitude != null
    const hasDelivery =
      w.deliveryLatitude != null && w.deliveryLongitude != null
    const num = i + 1
    const showPickup = displayMode !== "DELIVERY"
    const showDelivery = displayMode !== "PICKUP"

    if (showPickup && hasPickup) {
      markers.push({
        id: `${w.id}:pickup`,
        groupId: w.id,
        latitude: w.pickupLatitude as number,
        longitude: w.pickupLongitude as number,
        tone: "pickup",
        index: num,
        title: markerTitle(w, "PICKUP", t),
        style: { color, shape: "pin" },
      })
    }
    if (showDelivery && hasDelivery) {
      markers.push({
        id: `${w.id}:delivery`,
        groupId: w.id,
        latitude: w.deliveryLatitude as number,
        longitude: w.deliveryLongitude as number,
        tone: "delivery",
        index: num,
        title: markerTitle(w, "DELIVERY", t),
        style: { color, shape: "square" },
      })
    }
    if (displayMode === "BOTH" && hasPickup && hasDelivery) {
      links.push({
        id: w.id,
        from: [w.pickupLongitude as number, w.pickupLatitude as number],
        to: [w.deliveryLongitude as number, w.deliveryLatitude as number],
      })
    }
  })

  const isLocated = (w: WaybillSummaryResponse) => {
    const hasPickup = w.pickupLatitude != null && w.pickupLongitude != null
    const hasDelivery =
      w.deliveryLatitude != null && w.deliveryLongitude != null
    if (displayMode === "PICKUP") return hasPickup
    if (displayMode === "DELIVERY") return hasDelivery
    return hasPickup || hasDelivery
  }

  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const measure = () => setScrollMargin(el.offsetTop)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [hasRows, view])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 84,
    overscan: 6,
    gap: 8,
    scrollMargin,
  })
  const virtualItems = virtualizer.getVirtualItems()

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1]
    if (!last) return
    if (last.index >= rows.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [virtualItems, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setSelected(new Set())
    setBulkResult(null)
  }, [debouncedSearch, statuses, dateField, selectedDate, archivedFilter])

  const openWaybill = (w: WaybillSummaryResponse) =>
    navigate(`/app/company/waybills/${w.id}`)

  return (
    <div className="flex flex-col gap-4">
      {scoped && (
        <Button
          variant="ghost"
          size="sm"
          onClick={back}
          className="-ml-2 w-fit"
        >
          <ArrowLeft />
          {t("clientWaybills.back")}
        </Button>
      )}

      <Card className="py-4">
        <CardContent className="flex flex-col gap-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-48">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("waybills.searchPlaceholder")}
                className="pl-9"
                aria-label={t("waybills.searchPlaceholder")}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 shrink-0 justify-between gap-2 font-normal"
                >
                  {statuses.length === 0
                    ? t("waybills.filters.allStatuses")
                    : t("waybills.filters.statusCount", {
                        count: statuses.length,
                      })}
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  {t("waybills.filters.status")}
                </DropdownMenuLabel>
                {WAYBILL_STATUSES.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statuses.includes(s)}
                    onCheckedChange={(checked) =>
                      setStatuses((prev) =>
                        checked
                          ? [...prev, s]
                          : prev.filter((x) => x !== s),
                      )
                    }
                    onSelect={(e) => e.preventDefault()}
                  >
                    {t(`waybills.status.${s}`)}
                  </DropdownMenuCheckboxItem>
                ))}
                {statuses.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setStatuses([])}>
                      {t("waybills.filters.allStatuses")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <select
              value={archivedFilter}
              onChange={(e) =>
                setArchivedFilter(e.target.value as ArchivedFilter)
              }
              aria-label={t("waybills.filters.archived")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="active">
                {t("waybills.filters.archivedActive")}
              </option>
              <option value="archived">
                {t("waybills.filters.archivedOnly")}
              </option>
              <option value="all">{t("waybills.filters.archivedAll")}</option>
            </select>
            {canManage && (
              <Button onClick={() => setFormOpen(true)} className="shrink-0">
                <Plus />
                {t("waybills.new")}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-sm font-medium text-muted-foreground">
              {t("waybills.dateFilter.date")}
            </span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              aria-label={t("waybills.dateFilter.date")}
              className="h-9 w-auto"
            />
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDateInput(d, 1))}
                aria-label={t("waybills.dateFilter.nextDay")}
                className="flex h-[18px] w-7 items-center justify-center rounded-t-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDateInput(d, -1))}
                aria-label={t("waybills.dateFilter.prevDay")}
                className="flex h-[18px] w-7 items-center justify-center rounded-b-md border border-t-0 border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(today)}
              disabled={selectedDate === today}
              aria-label={t("waybills.dateFilter.reset")}
              title={t("waybills.dateFilter.reset")}
            >
              <RotateCcw />
            </Button>
          </div>

          {waybills.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(waybills.error)}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Segmented
        ariaLabel={t("waybills.title")}
        value={view}
        onChange={setView}
        options={[
          { value: "list", label: t("waybills.view.list") },
          { value: "map", label: t("waybills.view.map") },
        ]}
        className="self-start lg:hidden"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
        <div className={cn("min-w-0", view === "map" && "hidden lg:block")}>
          <Card className="py-4">
            <CardContent className="flex flex-col gap-3 px-3">
              {bulkResult && (
                <BulkResultAlert
                  result={bulkResult}
                  onDismiss={() => setBulkResult(null)}
                />
              )}

              {canManage && hasRows && (
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={allLoadedSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label={t("waybills.selection.selectAll")}
                    />
                    {selectedCount > 0
                      ? t("waybills.selection.count", { count: selectedCount })
                      : t("waybills.selection.selectAll")}
                  </label>

                  <div className="ml-auto flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          loading={bulkPending}
                          disabled={selectedCount === 0}
                          className="gap-2"
                        >
                          <ListChecks />
                          {t("waybills.selection.actions")}
                          <ChevronDown className="size-4 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                          {t("waybills.bulk.changeStatus")}
                        </DropdownMenuLabel>
                        {BULK_STATUS_TARGETS.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onSelect={() => runBulkStatus(s)}
                          >
                            <Tag />
                            {t(`waybills.status.${s}`)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => runBulkArchive(true)}>
                          <Archive />
                          {t("waybills.bulk.archive")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => runBulkArchive(false)}>
                          <ArchiveRestore />
                          {t("waybills.bulk.unarchive")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setCancelOpen(true)}
                        >
                          <Ban />
                          {t("waybills.bulk.cancel")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      disabled={selectedCount === 0 || bulkPending}
                    >
                      <X />
                      {t("waybills.selection.clear")}
                    </Button>
                  </div>
                </div>
              )}

              {waybills.isLoading && (
                <p className="text-sm text-muted-foreground">
                  {t("common.loading")}
                </p>
              )}

              {!waybills.isLoading && rows.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Package className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearch ||
                    statuses.length ||
                    archivedFilter !== "active" ||
                    dateFiltered
                      ? t("waybills.noResults")
                      : scoped
                        ? t("clientWaybills.empty")
                        : t("waybills.empty")}
                  </p>
                </div>
              )}

              {rows.length > 0 && (
                <div
                  ref={listRef}
                  className="relative"
                  style={{ height: virtualizer.getTotalSize() }}
                >
                  {virtualItems.map((item) => {
                    const waybill = rows[item.index]
                    if (!waybill) return null
                    return (
                      <div
                        key={waybill.id}
                        data-index={item.index}
                        ref={virtualizer.measureElement}
                        className="absolute top-0 left-0 w-full"
                        style={{
                          transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                        }}
                      >
                        <WaybillRow
                          waybill={waybill}
                          index={item.index + 1}
                          dateField={dateField}
                          located={isLocated(waybill)}
                          hovered={hoveredId === waybill.id}
                          selectable={canManage}
                          selected={selected.has(waybill.id)}
                          onToggleSelect={toggleSelect}
                          onHover={setHoveredId}
                          onOpen={openWaybill}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {rows.length > 0 && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  {isFetchingNextPage
                    ? t("waybills.pagination.loadingMore")
                    : !hasNextPage
                      ? t("waybills.pagination.loaded", {
                          loaded: rows.length,
                          total: totalElements,
                        })
                      : " "}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div
          className={cn(
            "min-w-0",
            view === "list" && "hidden lg:block",
            "lg:sticky lg:top-20",
          )}
        >
          {(isDesktop || view === "map") && (
            <div className="relative">
              <PointsMap
                markers={markers}
                links={links}
                hoveredGroupId={hoveredId}
                onHover={setHoveredId}
                onSelect={(id) =>
                  id !== "depot" && navigate(`/app/company/waybills/${id}`)
                }
                loading={waybills.isLoading}
                emptyLabel={t("waybills.map.noPoints")}
                className="h-[60vh] w-full lg:h-[calc(100dvh-7rem)]"
              />
            </div>
          )}
        </div>
      </div>

      <WaybillFormDialog
        companyId={companyId}
        open={formOpen}
        waybill={null}
        onOpenChange={setFormOpen}
        onSaved={(w) => navigate(`/app/company/waybills/${w.id}`)}
      />

      <Dialog
        open={cancelOpen}
        onOpenChange={(next) => !bulkCancel.isPending && setCancelOpen(next)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("waybills.bulk.cancelConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("waybills.bulk.cancelConfirmBody", { count: selectedCount })}
            </DialogDescription>
          </DialogHeader>
          {bulkCancel.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(bulkCancel.error)}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={bulkCancel.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={bulkCancel.isPending}
              onClick={runBulkCancel}
            >
              <Ban />
              {t("waybills.bulk.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BulkResultAlert({
  result,
  onDismiss,
}: {
  result: BulkResultResponse
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const failed = result.failed > 0
  const errors = result.results.filter((r) => r.status === "ERROR")
  return (
    <Alert variant={failed ? "destructive" : "default"} className="relative pr-9">
      <AlertTitle>
        {failed
          ? t("waybills.bulk.partial", {
              succeeded: result.succeeded,
              failed: result.failed,
            })
          : t("waybills.bulk.successAll", { count: result.succeeded })}
      </AlertTitle>
      {failed && (
        <AlertDescription>
          <ul className="ml-4 list-disc">
            {errors.slice(0, 8).map((e) => (
              <li key={e.id}>{e.error?.message ?? e.error?.code}</li>
            ))}
          </ul>
        </AlertDescription>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("common.done")}
        className="absolute top-2.5 right-2.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </Alert>
  )
}

/** Tooltip natif d'un marqueur (référence, ville, horaire planifié). */
function markerTitle(
  w: WaybillSummaryResponse,
  kind: WaybillDateField,
  t: TFunction,
): string {
  const city = kind === "PICKUP" ? w.pickupCity : w.deliveryCity
  const planned = kind === "PICKUP" ? w.pickupPlannedAt : w.deliveryPlannedAt
  const role =
    kind === "PICKUP"
      ? t("waybills.dateFilter.pickup")
      : t("waybills.dateFilter.delivery")
  return [w.reference, role, city, planned ? formatDateTime(planned) : null]
    .filter(Boolean)
    .join("\n")
}

export function WaybillsPage() {
  return (
    <CompanyShell showHeader={false}>
      {(company) => <WaybillsList company={company} />}
    </CompanyShell>
  )
}
