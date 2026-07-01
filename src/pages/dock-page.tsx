import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  Boxes,
  MapPin,
  Package,
  RotateCcw,
  Search,
  Warehouse,
  Weight,
} from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WaybillStatusBadge } from "@/components/transport-status-badge"
import { DockDwellBadge } from "@/components/dock-dwell"
import { getErrorMessage } from "@/lib/api-error"
import {
  dateInputToEndInstant,
  dateInputToStartInstant,
  formatDate,
} from "@/lib/date"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { CompanyMembership } from "@/features/auth"
import {
  useDockSummary,
  useInfiniteDock,
  type DockSummaryResponse,
  type WaybillSummaryResponse,
} from "@/features/waybills"

const PAGE_SIZE = 50
const DOCK_SORT = "dockEnteredAt,asc"

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(
    value,
  )
}

function SummaryBanner({ summary }: { summary: DockSummaryResponse }) {
  const { t } = useTranslation()
  const stats = [
    {
      icon: Warehouse,
      label: t("dock.summary.waybills"),
      value: formatNumber(summary.waybillCount, 0),
    },
    {
      icon: Package,
      label: t("dock.summary.packages"),
      value: formatNumber(summary.totalPackages, 0),
    },
    {
      icon: Weight,
      label: t("dock.summary.weight"),
      value: `${formatNumber(summary.totalGrossWeightKg, 1)} kg`,
    },
    {
      icon: Boxes,
      label: t("dock.summary.volume"),
      value: `${formatNumber(summary.totalVolumeM3, 2)} m³`,
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ icon: Icon, label, value }) => (
        <Card key={label} className="py-0">
          <CardContent className="flex items-center gap-3 px-4 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-lg font-semibold text-neutral-900">
                {value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DockRow({
  waybill,
  index,
  onOpen,
}: {
  waybill: WaybillSummaryResponse
  index: number
  onOpen: (waybill: WaybillSummaryResponse) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(waybill)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(waybill)
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
      >
        {index}
      </span>

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
        {waybill.deliveryCity && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {waybill.deliveryCity}
          </span>
        )}
        {waybill.dockEnteredAt && (
          <span>
            {t("dock.enteredOn")}: {formatDate(waybill.dockEnteredAt)}
          </span>
        )}
      </div>
    </div>
  )
}

function DockView({ company }: { company: CompanyMembership }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const companyId = company.companyId

  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "")
  const [from, setFrom] = useState(() => searchParams.get("from") ?? "")
  const [to, setTo] = useState(() => searchParams.get("to") ?? "")

  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedSearch) next.set("q", debouncedSearch)
    if (from) next.set("from", from)
    if (to) next.set("to", to)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, from, to])

  const summary = useDockSummary(companyId)

  const dock = useInfiniteDock(companyId, {
    q: debouncedSearch || undefined,
    dockFrom: from ? (dateInputToStartInstant(from) ?? undefined) : undefined,
    dockTo: to ? (dateInputToEndInstant(to) ?? undefined) : undefined,
    size: PAGE_SIZE,
    sort: DOCK_SORT,
  })
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = dock

  const rows = dock.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = dock.data?.pages[0]?.totalElements ?? rows.length
  const hasFilters = Boolean(debouncedSearch || from || to)

  const openWaybill = (w: WaybillSummaryResponse) =>
    navigate(`/app/company/waybills/${w.id}`)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Warehouse className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {t("dock.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("dock.description")}
          </p>
        </div>
      </div>

      {summary.data && <SummaryBanner summary={summary.data} />}

      <Card className="py-4">
        <CardContent className="flex flex-col gap-4 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-48">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("dock.searchPlaceholder")}
                className="pl-9"
                aria-label={t("dock.searchPlaceholder")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-sm font-medium text-muted-foreground">
              {t("dock.dateFilter.label")}
            </span>
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              aria-label={t("dock.dateFilter.from")}
              className="h-9 w-auto"
            />
            <span className="text-sm text-muted-foreground">
              {t("dock.dateFilter.to")}
            </span>
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              aria-label={t("dock.dateFilter.to")}
              className="h-9 w-auto"
            />
            {(from || to) && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setFrom("")
                  setTo("")
                }}
                aria-label={t("dock.dateFilter.reset")}
                title={t("dock.dateFilter.reset")}
              >
                <RotateCcw />
              </Button>
            )}
          </div>

          {dock.isError && (
            <Alert variant="destructive">
              <AlertDescription>{getErrorMessage(dock.error)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="flex flex-col gap-3 px-4">
          {dock.isLoading && (
            <p className="text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          )}

          {!dock.isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Warehouse className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? t("dock.noResults") : t("dock.empty")}
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              {rows.map((waybill, i) => (
                <DockRow
                  key={waybill.id}
                  waybill={waybill}
                  index={i + 1}
                  onOpen={openWaybill}
                />
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex flex-col items-center gap-2 pt-1">
              {hasNextPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {t("dock.loadMore")}
                </Button>
              ) : null}
              <p className="text-center text-xs text-muted-foreground">
                {t("waybills.pagination.loaded", {
                  loaded: rows.length,
                  total: totalElements,
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function DockPage() {
  return (
    <CompanyShell showHeader={false}>
      {(company) => <DockView company={company} />}
    </CompanyShell>
  )
}
