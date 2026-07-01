import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { Plus, Route as RouteIcon, Search } from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TourStatusBadge } from "@/components/transport-status-badge"
import { TourFormDialog } from "@/components/tour-form-dialog"
import { getErrorMessage } from "@/lib/api-error"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { formatCivilDate } from "@/lib/date"
import { formatDistance, formatDuration } from "@/lib/units"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { CompanyMembership } from "@/features/auth"
import {
  useInfiniteTours,
  TOUR_STATUSES,
  type TourStatus,
  type TourSummaryResponse,
} from "@/features/tours"

const PAGE_SIZE = 30

function TourRow({
  tour,
  onOpen,
}: {
  tour: TourSummaryResponse
  onOpen: (tour: TourSummaryResponse) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(tour)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(tour)
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="min-w-0 grow basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">
            {tour.name}
          </p>
          <TourStatusBadge status={tour.status} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {tour.reference}
          {tour.plannedDate ? ` · ${formatCivilDate(tour.plannedDate)}` : ""}
        </p>
      </div>

      {(tour.distanceMeters != null || tour.durationSeconds != null) && (
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <RouteIcon className="size-3.5" />
            {formatDistance(tour.distanceMeters)}
          </span>
          <span>{formatDuration(tour.durationSeconds)}</span>
        </div>
      )}
    </div>
  )
}

function ToursList({ company }: { company: CompanyMembership }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_TRANSPORTS)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<TourStatus | "">("")
  const [date, setDate] = useState("")
  const [sort, setSort] = useState("createdAt,desc")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [formOpen, setFormOpen] = useState(false)

  const tours = useInfiniteTours(companyId, {
    status: status || undefined,
    date: date || undefined,
    q: debouncedSearch || undefined,
    size: PAGE_SIZE,
    sort,
  })
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = tours

  const rows = tours.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = tours.data?.pages[0]?.totalElements ?? rows.length
  const hasRows = rows.length > 0

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
  }, [hasRows])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 72,
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
  }, [debouncedSearch, status, date, sort])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {t("tours.title")}
            </h1>
            {hasRows && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {totalElements}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("tours.description")}</p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus />
            {t("tours.new")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-48">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("tours.searchPlaceholder")}
                className="pl-9"
                aria-label={t("tours.searchPlaceholder")}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TourStatus | "")}
              aria-label={t("tours.filters.status")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">{t("tours.filters.allStatuses")}</option>
              {TOUR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`tours.status.${s}`)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label={t("tours.filters.date")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label={t("tours.filters.sort")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="createdAt,desc">{t("tours.sort.newest")}</option>
              <option value="plannedDate,asc">{t("tours.sort.plannedDate")}</option>
              <option value="name,asc">{t("tours.sort.name")}</option>
            </select>
          </div>

          {tours.isError && (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(tours.error)}</AlertDescription>
            </Alert>
          )}

          {tours.isLoading && (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          )}

          {!tours.isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <RouteIcon className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || status || date
                  ? t("tours.noResults")
                  : t("tours.empty")}
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
                const tour = rows[item.index]
                if (!tour) return null
                return (
                  <div
                    key={tour.id}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    <TourRow
                      tour={tour}
                      onOpen={(tr) => navigate(`/app/company/tours/${tr.id}`)}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {rows.length > 0 && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              {isFetchingNextPage
                ? t("tours.pagination.loadingMore")
                : !hasNextPage
                  ? t("tours.pagination.loaded", {
                      loaded: rows.length,
                      total: totalElements,
                    })
                  : " "}
            </p>
          )}
        </CardContent>
      </Card>

      <TourFormDialog
        companyId={companyId}
        open={formOpen}
        tour={null}
        onOpenChange={setFormOpen}
        onSaved={(tour) => navigate(`/app/company/tours/${tour.id}`)}
      />
    </div>
  )
}

export function ToursPage() {
  return (
    <CompanyShell showHeader={false}>
      {(company) => <ToursList company={company} />}
    </CompanyShell>
  )
}
