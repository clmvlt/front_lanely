import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BadgeEuro, Building2, Contact, Plus } from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/select-field"
import { TariffStatusBadge } from "@/components/tariff-status-badge"
import { TariffFormDialog } from "@/components/tariff-form-dialog"
import { FuelPricesPanel } from "@/components/fuel-prices-panel"
import { QuotePanel } from "@/components/quote-panel"
import { getErrorMessage } from "@/lib/api-error"
import { formatCivilDate } from "@/lib/date"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import type { CompanyMembership } from "@/features/auth"
import {
  TARIFF_STATUSES,
  useTariffs,
  type TariffStatus,
  type TariffSummaryResponse,
} from "@/features/pricing"

type Tab = "tariffs" | "fuel" | "quote"
const TABS: Tab[] = ["tariffs", "fuel", "quote"]

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

function TariffRow({
  tariff,
  onOpen,
}: {
  tariff: TariffSummaryResponse
  onOpen: (tariff: TariffSummaryResponse) => void
}) {
  const { t } = useTranslation()
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(tariff)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(tariff)
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <BadgeEuro className="size-4" />
      </span>
      <div className="min-w-0 grow basis-48">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">
            {tariff.name}
          </p>
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
        <p className="truncate text-xs text-muted-foreground">
          {tariff.currency} · {validity}
        </p>
      </div>
    </div>
  )
}

function TariffList({ company }: { company: CompanyMembership }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_PRICING)

  const statusParam = searchParams.get("status") as TariffStatus | null
  const status =
    statusParam && TARIFF_STATUSES.includes(statusParam) ? statusParam : ""
  const sort = searchParams.get("sort") || "createdAt,desc"

  const [createOpen, setCreateOpen] = useState(false)

  const tariffs = useTariffs(companyId, {
    status: status || undefined,
    size: 100,
    sort,
  })
  const rows = tariffs.data?.content ?? []

  const setParam = (key: string, value: string) =>
    setSearchParams(
      (prev) => {
        if (value) prev.set(key, value)
        else prev.delete(key)
        return prev
      },
      { replace: true },
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("pricing.detail.componentsHint")}
        </p>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus />
            {t("pricing.tariffs.new")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <SelectField
                id="tariffStatusFilter"
                label={t("pricing.tariffs.filters.status")}
                value={status}
                onChange={(v) => setParam("status", v)}
                options={TARIFF_STATUSES.map((value) => ({
                  value,
                  label: t(`pricing.status.${value}`),
                }))}
                placeholder={t("pricing.tariffs.filters.allStatuses")}
              />
            </div>
            <div className="w-48">
              <SelectField
                id="tariffSortFilter"
                label={t("pricing.tariffs.filters.sort")}
                value={sort}
                onChange={(v) => setParam("sort", v)}
                options={[
                  { value: "createdAt,desc", label: t("pricing.tariffs.sort.newest") },
                  { value: "createdAt,asc", label: t("pricing.tariffs.sort.oldest") },
                  { value: "name,asc", label: t("pricing.tariffs.sort.nameAsc") },
                  { value: "name,desc", label: t("pricing.tariffs.sort.nameDesc") },
                ]}
              />
            </div>
          </div>

          {tariffs.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(tariffs.error)}
              </AlertDescription>
            </Alert>
          )}

          {tariffs.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {status ? t("pricing.tariffs.noResults") : t("pricing.tariffs.empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((tariff) => (
                <TariffRow
                  key={tariff.id}
                  tariff={tariff}
                  onOpen={(item) =>
                    navigate(`/app/company/pricing/${item.id}`)
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TariffFormDialog
        companyId={companyId}
        open={createOpen}
        tariff={null}
        onOpenChange={setCreateOpen}
        onCreated={(tariff) => navigate(`/app/company/pricing/${tariff.id}`)}
      />
    </div>
  )
}

function PricingContent({ company }: { company: CompanyMembership }) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_PRICING)

  const tabParam = searchParams.get("tab") as Tab | null
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "tariffs"

  const setTab = (next: Tab) =>
    setSearchParams(
      (prev) => {
        if (next === "tariffs") prev.delete("tab")
        else prev.set("tab", next)
        return prev
      },
      { replace: true },
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {t("pricing.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("pricing.description")}
        </p>
      </div>

      <div
        role="tablist"
        className="inline-flex w-fit flex-wrap gap-1 rounded-md bg-accent/60 p-1"
      >
        <TabButton active={tab === "tariffs"} onClick={() => setTab("tariffs")}>
          {t("pricing.tabs.tariffs")}
        </TabButton>
        <TabButton active={tab === "fuel"} onClick={() => setTab("fuel")}>
          {t("pricing.tabs.fuel")}
        </TabButton>
        <TabButton active={tab === "quote"} onClick={() => setTab("quote")}>
          {t("pricing.tabs.quote")}
        </TabButton>
      </div>

      {tab === "tariffs" && <TariffList company={company} />}
      {tab === "fuel" && (
        <FuelPricesPanel companyId={company.companyId} canManage={canManage} />
      )}
      {tab === "quote" && <QuotePanel companyId={company.companyId} />}
    </div>
  )
}

export function PricingPage() {
  return (
    <CompanyShell showHeader={false}>
      {(company) => <PricingContent company={company} />}
    </CompanyShell>
  )
}
