import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Fuel, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SelectField } from "@/components/select-field"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { formatCivilDate, formatDateTime } from "@/lib/date"
import { formatFuelPrice } from "@/lib/money"
import {
  INDEXED_FUEL_TYPES,
  useCurrentFuelPrice,
  useFuelPriceHistory,
  useRefreshFuelPrices,
  type FuelType,
} from "@/features/pricing"

export function FuelPricesPanel({
  companyId,
  canManage,
}: {
  companyId: string
  canManage: boolean
}) {
  const { t } = useTranslation()
  const [fuelType, setFuelType] = useState<FuelType>("DIESEL")

  const current = useCurrentFuelPrice(companyId, { fuelType })
  const history = useFuelPriceHistory(companyId, { fuelType, size: 20 })
  const refresh = useRefreshFuelPrices(companyId)

  const fuelOptions = INDEXED_FUEL_TYPES.map((value) => ({
    value,
    label: t(`pricing.fuelType.${value}`),
  }))

  const noIndex =
    current.error instanceof ApiError && current.error.status === 404
  const price = current.data
  const rows = history.data?.content ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-48">
          <SelectField
            id="fuelTypeFilter"
            label={t("pricing.fuelPrices.fuelType")}
            value={fuelType}
            onChange={(v) => setFuelType(v as FuelType)}
            options={fuelOptions}
          />
        </div>
        {canManage && (
          <Button
            variant="outline"
            onClick={() => refresh.mutate()}
            loading={refresh.isPending}
          >
            <RefreshCw />
            {t("pricing.fuelPrices.refresh")}
          </Button>
        )}
      </div>

      {refresh.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(refresh.error)}</AlertDescription>
        </Alert>
      )}
      {refresh.isSuccess && refresh.data && (
        <Alert>
          <AlertDescription>
            {t("pricing.fuelPrices.refreshed", {
              count: refresh.data.ingested,
              source: refresh.data.source,
            })}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-foreground">
            {t("pricing.fuelPrices.current")}
          </h2>

          {current.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : noIndex ? (
            <p className="text-sm text-muted-foreground">
              {t("pricing.fuelPrices.noIndex")}
            </p>
          ) : current.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(current.error)}
              </AlertDescription>
            </Alert>
          ) : price ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Fuel className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
                  {formatFuelPrice(price.price, price.currency)}
                  <span className="ml-1 text-base font-normal text-muted-foreground">
                    /L
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("pricing.fuelPrices.referenceDate")}:{" "}
                  {formatCivilDate(price.referenceDate)} ·{" "}
                  {t("pricing.fuelPrices.source")}: {price.source}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-foreground">
            {t("pricing.fuelPrices.history")}
          </h2>

          {history.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : history.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(history.error)}
              </AlertDescription>
            </Alert>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("pricing.fuelPrices.historyEmpty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {formatCivilDate(row.referenceDate)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.source} · {formatDateTime(row.fetchedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-neutral-900 tabular-nums">
                    {formatFuelPrice(row.price, row.currency)}/L
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
