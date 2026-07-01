import { useEffect, useRef, useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import { Building2, Loader2, MapPin, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/form-field"
import { SelectField } from "@/components/select-field"
import { ClientCombobox } from "@/components/client-combobox"
import { PricingQuoteBreakdown } from "@/components/pricing-quote-breakdown"
import {
  PlannerPointRow,
  emptyPoint,
  isLocated,
  type PlannerPoint,
  type PointKind,
} from "@/components/quote-route-planner"
import { RoutePlannerMap } from "@/features/map"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { useCompanyDetail } from "@/features/companies"
import {
  useOptimizeTour,
  useRoute,
  useRoutingStatus,
  type Coordinate,
} from "@/features/ors"
import { useQuote, useTariffs, type QuoteRequest } from "@/features/pricing"

type PlannerMode = "route" | "tour"
type DistanceMode = "route" | "manual"

interface ComputedRoute {
  distanceMeters: number
  durationSeconds: number | null
  polyline: string | null
}

interface Snapshot {
  mode: PlannerMode
  withDepot: boolean
  depot: { latitude: number; longitude: number } | null
  located: (PlannerPoint & { lat: number; lon: number })[]
}

function nf(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

function roundKm(meters: number): number {
  return Math.round((meters / 1000) * 100) / 100
}

export function QuotePanel({ companyId }: { companyId: string }) {
  const { t } = useTranslation()
  const company = useCompanyDetail(companyId)
  const activeTariffs = useTariffs(companyId, { status: "ACTIVE", size: 100 })
  const routingStatus = useRoutingStatus()
  const route = useRoute()
  const optimize = useOptimizeTour()

  const idCounter = useRef(2)
  const newId = () => `p${idCounter.current++}`

  const [mode, setMode] = useState<PlannerMode>("route")
  const [useDepot, setUseDepot] = useState(true)
  const [points, setPoints] = useState<PlannerPoint[]>(() => [
    emptyPoint("p0"),
    emptyPoint("p1"),
  ])
  const [mapSearch, setMapSearch] = useState("")

  const [weight, setWeight] = useState("")
  const [volume, setVolume] = useState("")
  const [packages, setPackages] = useState("")
  const [stops, setStops] = useState("")

  const [tariffId, setTariffId] = useState("")
  const [billingClientId, setBillingClientId] = useState<string | null>(null)
  const [billingClientName, setBillingClientName] = useState<string | null>(null)

  const [distanceMode, setDistanceMode] = useState<DistanceMode>("route")
  const [manualKm, setManualKm] = useState("")

  const [computed, setComputed] = useState<ComputedRoute | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])
  // Prix unitaires surchargés pour cette estimation (sans toucher la grille).
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(
    {},
  )

  const depot = company.data?.depositAddress?.coordinate ?? null
  const depotName = company.data?.name ?? t("waybills.route.depot")
  const routingReady = routingStatus.data?.ready !== false
  const withDepot = useDepot && Boolean(depot)
  const located = points.filter(isLocated)

  const patch = (id: string, partial: Partial<PlannerPoint>) =>
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)))

  const addPoint = (kind: PointKind) =>
    setPoints((prev) => [...prev, emptyPoint(newId(), kind)])

  const removePoint = (id: string) =>
    setPoints((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)))

  // Lettre de voiture = enlèvement + livraison (exactement 2 points).
  const changeMode = (next: PlannerMode) => {
    setMode(next)
    if (next === "route") {
      setPoints((prev) => {
        const trimmed = prev.slice(0, 2)
        while (trimmed.length < 2) trimmed.push(emptyPoint(newId()))
        return trimmed
      })
    }
  }

  // Pose un point localisé : remplit un emplacement libre en mode lettre de
  // voiture (2 points), ajoute un arrêt en mode tournée.
  const placeLocated = (data: {
    lat: number
    lon: number
    query?: string
    label?: string
  }) =>
    setPoints((prev) => {
      const made = {
        query: data.query ?? "",
        label: data.label ?? "",
        lat: data.lat,
        lon: data.lon,
      }
      if (mode === "route") {
        const idx = prev.findIndex((p) => !isLocated(p))
        const target = idx === -1 ? prev.length - 1 : idx
        return prev.map((p, i) =>
          i === target ? { ...emptyPoint(p.id, "address"), ...made } : p,
        )
      }
      return [...prev, { ...emptyPoint(newId(), "address"), ...made }]
    })

  // Suppression d'un point depuis la carte (clic droit). En lettre de voiture on
  // vide l'emplacement (2 points fixes) ; en tournée on retire l'arrêt.
  const deletePoint = (id: string) =>
    setPoints((prev) => {
      if (mode === "route")
        return prev.map((p) => (p.id === id ? emptyPoint(p.id, p.kind) : p))
      return prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)
    })

  // --- Snapshot lu par le calcul live (évite les fermetures périmées). ---
  const latestRef = useRef<Snapshot>({ mode, withDepot, depot, located })
  latestRef.current = {
    mode,
    withDepot,
    depot,
    located: located as Snapshot["located"],
  }
  const routingReadyRef = useRef(routingReady)
  routingReadyRef.current = routingReady

  const computeRoute = (s: Snapshot) => {
    const depotCoord: Coordinate | null = s.depot
      ? { lat: s.depot.latitude, lon: s.depot.longitude }
      : null
    const ordered: Coordinate[] = []
    if (s.withDepot && depotCoord) ordered.push(depotCoord)
    s.located.forEach((p) => ordered.push({ lat: p.lat, lon: p.lon }))
    if (s.withDepot && depotCoord) ordered.push(depotCoord)
    if (ordered.length < 2) return
    setSkipped([])
    route.mutate(
      { points: ordered, geometryFormat: "POLYLINE" },
      {
        onSuccess: (r) => {
          setComputed({
            distanceMeters: r.distanceMeters,
            durationSeconds: r.durationSeconds,
            polyline: r.geometryPolyline ?? null,
          })
          setStops(String(s.located.length))
        },
      },
    )
  }

  // Optimisation de l'ordre des arrêts (action explicite, mode tournée). On
  // réordonne la liste des points selon l'ordre de passage optimal ; le calcul
  // d'itinéraire live redessine alors la tournée dans le nouvel ordre.
  const onOptimize = () => {
    if (!depot) return
    optimize.mutate(
      {
        depot: { lat: depot.latitude, lon: depot.longitude },
        geometryFormat: "POLYLINE",
        visits: located.map((p, i) => ({
          id: p.id,
          name: p.label || `${i + 1}`,
          lat: p.lat,
          lon: p.lon,
        })),
      },
      {
        onSuccess: (res) => {
          const orderedStops = res.routes.flatMap((rt) => rt.stops)
          const rank = new Map(orderedStops.map((s, i) => [s.visitId, i]))
          setPoints((prev) => {
            const loc = prev.filter(isLocated)
            const rest = prev.filter((p) => !isLocated(p))
            const sorted = [...loc].sort(
              (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
            )
            return [...sorted, ...rest]
          })
          setSkipped(res.skippedVisits.map((sk) => sk.name || sk.visitId))
        },
      },
    )
  }

  // Clé du calcul d'itinéraire : ne dépend QUE de la géométrie (pas du cargo).
  const computeKey = JSON.stringify({
    withDepot,
    depot,
    pts: located.map((p) => [p.lat, p.lon]),
  })
  const debouncedComputeKey = useDebouncedValue(computeKey, 450)

  // Itinéraire calculé dans l'ordre des points (lettre de voiture ET tournée).
  useEffect(() => {
    const s = latestRef.current
    const enough =
      s.located.length + (s.withDepot ? 1 : 0) >= 2 && s.located.length >= 1
    if (!enough || !routingReadyRef.current) {
      setComputed(null)
      setSkipped([])
      return
    }
    computeRoute(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedComputeKey])

  // --- Devis live ---
  const effDistanceKm =
    distanceMode === "manual" ? nf(manualKm) : computed ? roundKm(computed.distanceMeters) : null
  const inputs = {
    distanceKm: effDistanceKm,
    totalWeightKg: nf(weight),
    totalVolumeM3: nf(volume),
    packageCount: nf(packages),
    stopCount: nf(stops),
  }
  const request: QuoteRequest = {
    tariffId: tariffId || null,
    clientId: billingClientId,
    inputs,
  }
  const requestJson = JSON.stringify(request)
  const debouncedRequestJson = useDebouncedValue(requestJson, 450)
  const debouncedRequest = JSON.parse(debouncedRequestJson) as QuoteRequest
  const hasInput = Object.values(debouncedRequest.inputs ?? {}).some(
    (v) => v != null,
  )
  const quote = useQuote(companyId, debouncedRequest, hasInput)

  const noTariff =
    quote.error instanceof ApiError &&
    quote.error.body?.message != null &&
    quote.error.status === 400

  const pendingCompute = route.isPending || optimize.isPending

  const tariffOptions = (activeTariffs.data?.content ?? []).map((tariff) => ({
    value: tariff.id,
    label: tariff.name,
  }))

  const pointLabel = (index: number) =>
    mode === "tour"
      ? t("pricing.route.stopLabel", { n: index + 1 })
      : index === 0
        ? t("pricing.route.shipperLabel")
        : t("pricing.route.consigneeLabel")

  const canOptimize = Boolean(depot) && located.length >= 2

  // Repères localisés pour la carte (numérotés dans l'ordre de la liste).
  const mapPoints = located.map((p, i) => ({
    id: p.id,
    latitude: p.lat,
    longitude: p.lon,
    index: i + 1,
    title: p.label || undefined,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
      {/* Volet carte */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            className="inline-flex shrink-0 gap-1 rounded-md bg-accent/60 p-1"
          >
            <SegButton
              active={mode === "route"}
              onClick={() => changeMode("route")}
            >
              {t("pricing.route.modeRoute")}
            </SegButton>
            <SegButton
              active={mode === "tour"}
              onClick={() => changeMode("tour")}
            >
              {t("pricing.route.modeTour")}
            </SegButton>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={withDepot}
              disabled={!depot}
              onCheckedChange={(c) => setUseDepot(c === true)}
            />
            <span className={cn(!depot && "text-muted-foreground")}>
              {t("pricing.route.useDepot")}
            </span>
          </label>
        </div>

        <RoutePlannerMap
          points={mapPoints}
          depot={
            withDepot && depot
              ? {
                  latitude: depot.latitude,
                  longitude: depot.longitude,
                  title: depotName,
                }
              : null
          }
          polyline={computed?.polyline ?? null}
          distanceMeters={computed?.distanceMeters ?? null}
          durationSeconds={computed?.durationSeconds ?? null}
          loading={pendingCompute}
          onAddPoint={(coord) =>
            placeLocated({ lat: coord.latitude, lon: coord.longitude })
          }
          onMovePoint={(id, coord) =>
            patch(id, { lat: coord.latitude, lon: coord.longitude })
          }
          onDeletePoint={deletePoint}
          search={{
            query: mapSearch,
            onQueryChange: setMapSearch,
            onSelect: (s) => {
              setMapSearch("")
              placeLocated({
                lat: s.latitude,
                lon: s.longitude,
                query: s.label,
                label: s.label,
              })
            },
            placeholder: t("pricing.route.searchPlaceholder"),
            label: t("pricing.route.searchPlaceholder"),
          }}
          className="h-[22rem] sm:h-[26rem] lg:h-[30rem]"
        />

        {!routingReady && (
          <Alert>
            <AlertDescription>
              {t("transport.routing.unavailable")}
            </AlertDescription>
          </Alert>
        )}
        {(route.isError || optimize.isError) && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(route.error ?? optimize.error)}
            </AlertDescription>
          </Alert>
        )}
        {skipped.length > 0 && (
          <Alert>
            <AlertDescription className="grid gap-1">
              <span className="font-medium">{t("tours.skipped.title")}</span>
              <ul className="ml-4 list-disc text-xs">
                {skipped.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">
                {mode === "tour"
                  ? t("pricing.route.stops")
                  : t("pricing.route.points")}
              </h3>
              {mode === "tour" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOptimize}
                  loading={optimize.isPending}
                  disabled={!canOptimize}
                >
                  <Sparkles />
                  {t("pricing.route.optimize")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "tour"
                ? t("pricing.route.pointsHint")
                : t("pricing.route.waybillHint")}
            </p>
            <div className={cn(mode === "route" ? "grid gap-2 sm:grid-cols-2" : "flex flex-col gap-2")}>
              {points.map((p, index) => (
                <PlannerPointRow
                  key={p.id}
                  companyId={companyId}
                  point={p}
                  label={pointLabel(index)}
                  biasLat={depot?.latitude ?? null}
                  biasLon={depot?.longitude ?? null}
                  onChange={(partial) => patch(p.id, partial)}
                  onRemove={() => removePoint(p.id)}
                  canRemove={mode === "tour" && points.length > 1}
                />
              ))}
            </div>
            {mode === "tour" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => addPoint("address")}
                >
                  <MapPin />
                  {t("pricing.route.addAddress")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => addPoint("client")}
                >
                  <Building2 />
                  {t("pricing.route.addClient")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volet devis */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="quoteDistance">
                  {t("pricing.quote.distanceKm")}
                </Label>
                <div
                  role="tablist"
                  className="inline-flex shrink-0 gap-1 rounded-md bg-accent/60 p-1"
                >
                  <SegButton
                    active={distanceMode === "route"}
                    onClick={() => setDistanceMode("route")}
                  >
                    {t("pricing.quote.distanceFromRoute")}
                  </SegButton>
                  <SegButton
                    active={distanceMode === "manual"}
                    onClick={() => setDistanceMode("manual")}
                  >
                    {t("pricing.quote.distanceManual")}
                  </SegButton>
                </div>
              </div>
              {distanceMode === "manual" ? (
                <Input
                  id="quoteDistance"
                  type="number"
                  min={0}
                  step="any"
                  value={manualKm}
                  onChange={(e) => setManualKm(e.target.value)}
                  autoComplete="off"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {computed
                    ? t("pricing.quote.distanceComputed", {
                        km: roundKm(computed.distanceMeters),
                      })
                    : t("pricing.quote.distanceFromRouteHint")}
                </p>
              )}
            </div>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="quoteWeight"
                type="number"
                min={0}
                step="any"
                label={t("pricing.quote.totalWeightKg")}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoComplete="off"
              />
              <FormField
                id="quoteVolume"
                type="number"
                min={0}
                step="any"
                label={t("pricing.quote.totalVolumeM3")}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                autoComplete="off"
              />
              <FormField
                id="quotePackages"
                type="number"
                min={0}
                step="1"
                label={t("pricing.quote.packageCount")}
                value={packages}
                onChange={(e) => setPackages(e.target.value)}
                autoComplete="off"
              />
              <FormField
                id="quoteStops"
                type="number"
                min={0}
                step="1"
                label={t("pricing.quote.stopCount")}
                value={stops}
                onChange={(e) => setStops(e.target.value)}
                autoComplete="off"
              />
            </div>

            <SelectField
              id="quoteTariff"
              label={t("pricing.quote.tariff")}
              value={tariffId}
              onChange={setTariffId}
              options={tariffOptions}
              placeholder={t("pricing.quote.tariffAuto")}
            />
            <ClientCombobox
              companyId={companyId}
              id="quoteClient"
              label={t("pricing.quote.client")}
              value={billingClientId}
              selectedLabel={billingClientName ?? billingClientId}
              onSelect={(client) => {
                setBillingClientId(client?.id ?? null)
                setBillingClientName(client?.name ?? null)
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium text-foreground">
                {t("pricing.breakdown.grid")}
              </h2>
              {quote.isFetching && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("pricing.quote.updating")}
                </span>
              )}
              {!quote.isFetching && quote.data && (
                <span className="truncate text-sm text-muted-foreground">
                  {quote.data.tariffName}
                </span>
              )}
            </div>
            {!hasInput ? (
              <p className="text-sm text-muted-foreground">
                {t("pricing.quote.empty")}
              </p>
            ) : quote.isError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {noTariff
                    ? getErrorMessage(quote.error)
                    : (getErrorMessage(quote.error) ?? t("pricing.quote.noTariff"))}
                </AlertDescription>
              </Alert>
            ) : quote.data ? (
              <PricingQuoteBreakdown
                quote={quote.data}
                editable
                overrides={priceOverrides}
                onOverrideChange={(key, value) =>
                  setPriceOverrides((prev) => {
                    if (value == null) {
                      if (!(key in prev)) return prev
                      const rest = { ...prev }
                      delete rest[key]
                      return rest
                    }
                    return { ...prev, [key]: value }
                  })
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("common.loading")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SegButton({
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
        "rounded px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
