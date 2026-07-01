import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { Plus, Search, Truck } from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VehicleFormDialog } from "@/components/vehicle-form-dialog"
import { getErrorMessage } from "@/lib/api-error"
import { formatDate } from "@/lib/date"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { CompanyMembership } from "@/features/auth"
import {
  useInfiniteVehicles,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  type VehicleStatus,
  type VehicleSummaryResponse,
  type VehicleType,
} from "@/features/vehicles"

// Page serveur bornée à 100 ; on charge par paquets au fil du scroll.
const PAGE_SIZE = 30

const STATUS_BADGE: Record<VehicleStatus, string> = {
  ACTIVE: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
  INACTIVE: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
  SOLD: "bg-[var(--status-collected-bg)] text-[var(--status-collected-text)]",
  OUT_OF_SERVICE:
    "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]",
  ARCHIVED: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
}

interface VehicleRowProps {
  vehicle: VehicleSummaryResponse
  onOpen: (vehicle: VehicleSummaryResponse) => void
}

function VehicleRow({ vehicle, onOpen }: VehicleRowProps) {
  const { t } = useTranslation()
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ")
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(vehicle)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(vehicle)
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Truck className="size-4" />
      </span>
      <div className="min-w-0 grow basis-48">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">
            {vehicle.registrationPlate}
          </p>
          <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
            {t(`vehicles.type.${vehicle.vehicleType}`)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {makeModel || t("vehicles.noValue")}
          {vehicle.latestMileageKm !== null
            ? ` · ${vehicle.latestMileageKm.toLocaleString()} ${t("vehicles.mileageUnit")}`
            : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {formatDate(vehicle.createdAt)}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_BADGE[vehicle.status],
          )}
        >
          {t(`vehicles.status.${vehicle.status}`)}
        </span>
      </div>
    </div>
  )
}

function VehiclesList({ company }: { company: CompanyMembership }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_VEHICLES)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<VehicleStatus | "">("")
  const [type, setType] = useState<VehicleType | "">("")
  const [sort, setSort] = useState("createdAt,desc")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [formOpen, setFormOpen] = useState(false)

  const vehicles = useInfiniteVehicles(companyId, {
    status: status || undefined,
    type: type || undefined,
    q: debouncedSearch || undefined,
    size: PAGE_SIZE,
    sort,
  })
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = vehicles

  const rows = vehicles.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = vehicles.data?.pages[0]?.totalElements ?? rows.length
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
    estimateSize: () => 76,
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
  }, [debouncedSearch, status, type, sort])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {t("vehicles.title")}
            </h1>
            {hasRows && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {totalElements}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("vehicles.description")}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus />
            {t("vehicles.new")}
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
                placeholder={t("vehicles.searchPlaceholder")}
                className="pl-9"
                aria-label={t("vehicles.searchPlaceholder")}
              />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as VehicleType | "")}
              aria-label={t("vehicles.filters.type")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">{t("vehicles.allTypes")}</option>
              {VEHICLE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`vehicles.type.${value}`)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus | "")}
              aria-label={t("vehicles.filters.status")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">{t("vehicles.allStatuses")}</option>
              {VEHICLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {t(`vehicles.status.${value}`)}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label={t("vehicles.filters.sort")}
              className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="createdAt,desc">{t("vehicles.sort.newest")}</option>
              <option value="createdAt,asc">{t("vehicles.sort.oldest")}</option>
              <option value="registrationPlate,asc">
                {t("vehicles.sort.plateAsc")}
              </option>
              <option value="registrationPlate,desc">
                {t("vehicles.sort.plateDesc")}
              </option>
              <option value="updatedAt,desc">
                {t("vehicles.sort.updated")}
              </option>
            </select>
          </div>

          {vehicles.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(vehicles.error)}
              </AlertDescription>
            </Alert>
          )}

          {vehicles.isLoading && (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          )}

          {!vehicles.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? t("vehicles.noResults") : t("vehicles.empty")}
            </p>
          )}

          {rows.length > 0 && (
            <div
              ref={listRef}
              className="relative"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualItems.map((item) => {
                const vehicle = rows[item.index]
                if (!vehicle) return null
                return (
                  <div
                    key={vehicle.id}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    className="absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    <VehicleRow
                      vehicle={vehicle}
                      onOpen={(v) =>
                        navigate(`/app/company/vehicles/${v.id}`)
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}

          {rows.length > 0 && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              {isFetchingNextPage
                ? t("vehicles.pagination.loadingMore")
                : !hasNextPage
                  ? t("vehicles.pagination.loaded", {
                      loaded: rows.length,
                      total: totalElements,
                    })
                  : " "}
            </p>
          )}
        </CardContent>
      </Card>

      <VehicleFormDialog
        companyId={companyId}
        open={formOpen}
        vehicle={null}
        onOpenChange={setFormOpen}
        onCreated={(vehicle) =>
          navigate(`/app/company/vehicles/${vehicle.id}`)
        }
      />
    </div>
  )
}

export function VehiclesPage() {
  return (
    <CompanyShell showHeader={false}>
      {(company) => <VehiclesList company={company} />}
    </CompanyShell>
  )
}
