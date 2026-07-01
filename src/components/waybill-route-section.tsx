import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  RefreshCw,
  Route as RouteIcon,
  Warehouse,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RouteMap, type MapPoint } from "@/features/map"
import { useMatrix, useRoute, useRoutingStatus } from "@/features/ors"
import { useCompanyDetail } from "@/features/companies"
import type { RouteInfoDto, RouteInputDto } from "@/features/waybills"
import type { CoordinateDto } from "@/lib/transport-types"
import { getErrorMessage } from "@/lib/api-error"
import { dateTimeLocalToInstant, formatDateTime } from "@/lib/date"
import { formatDistance, formatDuration } from "@/lib/units"
import { cn } from "@/lib/utils"

interface Legs {
  toPickup: number
  toDelivery: number
  toDepot: number
}

type Anchor = "pickup" | "delivery" | "none"

interface Timeline {
  depotDeparture: Date | null
  pickupArrival: Date | null
  deliveryArrival: Date | null
  depotReturn: Date | null
  anchor: Anchor
  deliveryDelaySeconds: number | null
}

function parsePlanned(value: string): Date | null {
  const iso = dateTimeLocalToInstant(value)
  return iso ? new Date(iso) : null
}

function shift(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000)
}

function buildTimeline(
  legs: Legs | null,
  pickupPlanned: Date | null,
  deliveryPlanned: Date | null,
): Timeline | null {
  if (!legs) return null
  if (pickupPlanned) {
    const pickupArrival = pickupPlanned
    const deliveryArrival = shift(pickupArrival, legs.toDelivery)
    return {
      depotDeparture: shift(pickupArrival, -legs.toPickup),
      pickupArrival,
      deliveryArrival,
      depotReturn: shift(deliveryArrival, legs.toDepot),
      anchor: "pickup",
      deliveryDelaySeconds: deliveryPlanned
        ? Math.round(
            (deliveryArrival.getTime() - deliveryPlanned.getTime()) / 1000,
          )
        : null,
    }
  }
  if (deliveryPlanned) {
    const deliveryArrival = deliveryPlanned
    const pickupArrival = shift(deliveryArrival, -legs.toDelivery)
    return {
      depotDeparture: shift(pickupArrival, -legs.toPickup),
      pickupArrival,
      deliveryArrival,
      depotReturn: shift(deliveryArrival, legs.toDepot),
      anchor: "delivery",
      deliveryDelaySeconds: null,
    }
  }
  return {
    depotDeparture: null,
    pickupArrival: null,
    deliveryArrival: null,
    depotReturn: null,
    anchor: "none",
    deliveryDelaySeconds: null,
  }
}

function coordKey(c: CoordinateDto | null): string {
  return c ? `${c.latitude},${c.longitude}` : "-"
}

/** Convertit une coordonnée backend (latitude/longitude) au format ORS (lat/lon). */
function toOrs(c: CoordinateDto): { lat: number; lon: number } {
  return { lat: c.latitude, lon: c.longitude }
}

interface WaybillRouteSectionProps {
  companyId: string
  active: boolean
  pickup: CoordinateDto | null
  delivery: CoordinateDto | null
  pickupPlannedAt: string
  deliveryPlannedAt: string
  pickupLabel: string
  deliveryLabel: string
  initial?: RouteInfoDto | null
  value: RouteInputDto | null
  onChange: (route: RouteInputDto | null) => void
}

export function WaybillRouteSection({
  companyId,
  active,
  pickup,
  delivery,
  pickupPlannedAt,
  deliveryPlannedAt,
  pickupLabel,
  deliveryLabel,
  initial,
  value,
  onChange,
}: WaybillRouteSectionProps) {
  const { t } = useTranslation()
  const company = useCompanyDetail(companyId)
  const routingStatus = useRoutingStatus()
  const route = useRoute()
  const matrix = useMatrix()

  const [legs, setLegs] = useState<Legs | null>(null)

  const depot = company.data?.depositAddress?.coordinate ?? null
  const depotName = company.data?.name ?? t("waybills.route.depot")
  const allPoints = Boolean(depot && pickup && delivery)
  const routingReady = routingStatus.data?.ready !== false

  const pointsKey = [coordKey(depot), coordKey(pickup), coordKey(delivery)].join(
    "|",
  )
  const computedKey = useRef<string | null>(null)

  const compute = () => {
    if (!depot || !pickup || !delivery) return
    computedKey.current = pointsKey
    const loop = [depot, pickup, delivery, depot]
    route.mutate(
      { points: loop.map(toOrs), geometryFormat: "POLYLINE" },
      {
        onSuccess: (r) =>
          onChange({
            distanceMeters: r.distanceMeters,
            durationSeconds: r.durationSeconds,
            geometryPolyline: r.geometryPolyline ?? null,
          }),
      },
    )
    matrix.mutate(
      { points: [depot, pickup, delivery].map(toOrs) },
      {
        onSuccess: (m) => {
          const d = m.durationsSeconds
          setLegs({
            toPickup: d[0]?.[1] ?? 0,
            toDelivery: d[1]?.[2] ?? 0,
            toDepot: d[2]?.[0] ?? 0,
          })
        },
      },
    )
  }

  useEffect(() => {
    if (!active || !allPoints || !routingReady) return
    if (computedKey.current === pointsKey) return
    compute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, allPoints, routingReady, pointsKey])

  const polyline = value?.geometryPolyline ?? initial?.geometryPolyline ?? null
  const distanceMeters = value?.distanceMeters ?? initial?.distanceMeters ?? null
  const durationSeconds =
    value?.durationSeconds ?? initial?.durationSeconds ?? null
  const loading = route.isPending || matrix.isPending

  const timeline = buildTimeline(
    legs,
    parsePlanned(pickupPlannedAt),
    parsePlanned(deliveryPlannedAt),
  )

  const markers: MapPoint[] = []
  if (depot) {
    markers.push({
      latitude: depot.latitude,
      longitude: depot.longitude,
      tone: "depot",
      title: depotName,
    })
  }
  if (pickup) {
    markers.push({
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      tone: "pickup",
      index: 1,
      title: pickupLabel,
    })
  }
  if (delivery) {
    markers.push({
      latitude: delivery.latitude,
      longitude: delivery.longitude,
      tone: "delivery",
      index: 2,
      title: deliveryLabel,
    })
  }

  const missing = [
    !depot && t("waybills.route.missing.depot"),
    !pickup && t("waybills.route.missing.pickup"),
    !delivery && t("waybills.route.missing.delivery"),
  ].filter((m): m is string => Boolean(m))

  const stops = [
    {
      key: "depotDeparture",
      icon: Warehouse,
      label: t("waybills.route.stops.depotDeparture"),
      name: depotName,
      time: timeline?.depotDeparture ?? null,
      legAfter: legs?.toPickup ?? null,
      highlight: true,
    },
    {
      key: "pickup",
      icon: MapPin,
      label: t("waybills.route.stops.pickup"),
      name: pickupLabel,
      time: timeline?.pickupArrival ?? null,
      legAfter: legs?.toDelivery ?? null,
      highlight: false,
    },
    {
      key: "delivery",
      icon: PackageCheck,
      label: t("waybills.route.stops.delivery"),
      name: deliveryLabel,
      time: timeline?.deliveryArrival ?? null,
      legAfter: legs?.toDepot ?? null,
      highlight: false,
    },
    {
      key: "depotReturn",
      icon: Warehouse,
      label: t("waybills.route.stops.depotReturn"),
      name: depotName,
      time: timeline?.depotReturn ?? null,
      legAfter: null,
      highlight: false,
    },
  ]

  const delay = timeline?.deliveryDelaySeconds ?? null

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <RouteIcon className="size-4 text-muted-foreground" />
          {t("waybills.route.title")}
        </h3>
        {allPoints && routingReady && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={compute}
            loading={loading}
          >
            <RefreshCw />
            {value || initial
              ? t("waybills.route.recompute")
              : t("waybills.route.compute")}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("waybills.route.description")}
      </p>

      {!routingReady && (
        <Alert>
          <AlertDescription>
            {t("transport.routing.unavailable")}
          </AlertDescription>
        </Alert>
      )}

      {missing.length > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription className="grid gap-1">
            <span>{t("waybills.route.missing.title")}</span>
            <ul className="ml-4 list-disc text-xs">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            {!depot && (
              <span className="text-xs opacity-90">
                {t("waybills.route.missing.depotHint")}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {route.isError && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(route.error)}</AlertDescription>
        </Alert>
      )}

      {(polyline || markers.length > 0) && (
        <RouteMap
          polyline={polyline}
          distanceMeters={distanceMeters}
          durationSeconds={durationSeconds}
          markers={markers}
          loading={loading}
          unavailable={!routingReady && !polyline && markers.length === 0}
          className="h-64 sm:h-72"
        />
      )}

      {timeline?.depotDeparture && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Clock className="size-4 text-primary" />
          <span className="text-sm text-foreground">
            {t("waybills.route.leaveDepotAt")}
          </span>
          <span className="text-base font-semibold text-primary">
            {formatDateTime(timeline.depotDeparture.toISOString())}
          </span>
        </div>
      )}

      {delay != null && <DeliveryFeasibility delaySeconds={delay} />}

      {(timeline || distanceMeters != null) && (
        <div className="grid gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground">
              {t("waybills.route.schedule")}
            </h4>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <RouteIcon className="size-3.5 text-muted-foreground" />
                {formatDistance(distanceMeters)}
              </span>
              <span className="text-muted-foreground">
                {formatDuration(durationSeconds)}
              </span>
            </div>
          </div>

          {timeline?.anchor === "none" && (
            <p className="text-xs text-muted-foreground">
              {t("waybills.route.noPlannedTimes")}
            </p>
          )}
          {timeline?.anchor === "delivery" && (
            <p className="text-xs text-muted-foreground">
              {t("waybills.route.anchoredOnDelivery")}
            </p>
          )}

          <ol className="grid gap-0">
            {stops.map((stop) => (
              <li key={stop.key}>
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      stop.highlight
                        ? "bg-primary/10 text-primary"
                        : "bg-accent text-muted-foreground",
                    )}
                  >
                    <stop.icon className="size-4" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {stop.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {stop.name}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {stop.time
                        ? formatDateTime(stop.time.toISOString())
                        : "-"}
                    </span>
                  </div>
                </div>
                {stop.legAfter != null && (
                  <div className="ml-3 flex h-7 items-center gap-2 border-l pl-[1.375rem] text-xs text-muted-foreground">
                    <RouteIcon className="size-3" />
                    {formatDuration(stop.legAfter)}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function DeliveryFeasibility({ delaySeconds }: { delaySeconds: number }) {
  const { t } = useTranslation()
  const abs = Math.abs(delaySeconds)
  if (abs <= 60) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--status-delivered-text)]/30 bg-[var(--status-delivered-bg)] px-4 py-2.5 text-sm text-[var(--status-delivered-text)]">
        <CheckCircle2 className="size-4 shrink-0" />
        {t("waybills.route.onSchedule")}
      </div>
    )
  }
  const late = delaySeconds > 0
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
        late
          ? "border-[var(--status-failed-text)]/30 bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]"
          : "border-[var(--status-delivered-text)]/30 bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      {late
        ? t("waybills.route.late", { duration: formatDuration(abs) })
        : t("waybills.route.ahead", { duration: formatDuration(abs) })}
    </div>
  )
}
