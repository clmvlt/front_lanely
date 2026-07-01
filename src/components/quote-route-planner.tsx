import { useEffect } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Building2, MapPin, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AddressAutocomplete } from "@/components/address-autocomplete"
import { ClientCombobox } from "@/components/client-combobox"
import { SelectField } from "@/components/select-field"
import { useClient } from "@/features/clients"
import type { ClientAddressResponse } from "@/features/clients"

export type PointKind = "address" | "client"

/**
 * Un point du planificateur de devis. Localisé de trois façons : adresse libre
 * (autocomplete), client (adresse enregistrée), ou clic sur la carte (coords
 * seules). `lat`/`lon` non nuls = point exploitable.
 */
export interface PlannerPoint {
  id: string
  kind: PointKind
  /** Saisie libre (mode adresse). */
  query: string
  clientId: string | null
  clientName: string | null
  clientAddressId: string | null
  /** Libellé affiché (carte, liste). */
  label: string
  lat: number | null
  lon: number | null
}

export function emptyPoint(id: string, kind: PointKind = "address"): PlannerPoint {
  return {
    id,
    kind,
    query: "",
    clientId: null,
    clientName: null,
    clientAddressId: null,
    label: "",
    lat: null,
    lon: null,
  }
}

export function isLocated(
  p: PlannerPoint,
): p is PlannerPoint & { lat: number; lon: number } {
  return typeof p.lat === "number" && typeof p.lon === "number"
}

function formatClientAddress(a: ClientAddressResponse): string {
  return (
    a.label ||
    [a.address.line1, a.address.city].filter(Boolean).join(", ") ||
    a.type
  )
}

function pickDefaultAddress(
  addresses: ClientAddressResponse[],
): ClientAddressResponse | undefined {
  return (
    addresses.find((a) => a.isPrimary) ??
    addresses.find((a) => a.isDefaultShipping) ??
    addresses[0]
  )
}

interface PlannerPointRowProps {
  companyId: string
  point: PlannerPoint
  /** Libellé du point (« Point 1 », « Arrêt 1 »...). */
  label: string
  biasLat?: number | null
  biasLon?: number | null
  onChange: (partial: Partial<PlannerPoint>) => void
  onRemove: () => void
  canRemove: boolean
}

/**
 * Ligne d'un point du planificateur : bascule Adresse / Client, puis éditeur
 * correspondant (autocomplete d'adresse, ou sélection client + son adresse).
 */
export function PlannerPointRow({
  companyId,
  point,
  label,
  biasLat,
  biasLon,
  onChange,
  onRemove,
  canRemove,
}: PlannerPointRowProps) {
  const { t } = useTranslation()
  const client = useClient(
    companyId,
    point.kind === "client" ? (point.clientId ?? "") : "",
  )
  const addresses = (client.data?.addresses ?? []).filter((a) => a.active)

  const applyAddress = (a: ClientAddressResponse) =>
    onChange({
      clientAddressId: a.id,
      lat: a.latitude,
      lon: a.longitude,
      label: formatClientAddress(a),
    })

  // Adresse par défaut auto-sélectionnée à la sélection d'un client.
  useEffect(() => {
    if (point.kind !== "client" || !point.clientId) return
    if (point.clientAddressId) return
    if (addresses.length === 0) return
    const def = pickDefaultAddress(addresses)
    if (def) applyAddress(def)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point.kind, point.clientId, point.clientAddressId, client.data])

  const locatedPoint = isLocated(point) ? point : null

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-2">
      <div className="flex items-center gap-2">
        <div className="inline-flex shrink-0 gap-1 rounded-md bg-accent/60 p-0.5">
          <KindButton
            active={point.kind === "address"}
            onClick={() =>
              onChange({
                kind: "address",
                clientId: null,
                clientName: null,
                clientAddressId: null,
                lat: null,
                lon: null,
                label: "",
                query: "",
              })
            }
          >
            <MapPin className="size-3.5" />
            {t("pricing.route.pointKindAddress")}
          </KindButton>
          <KindButton
            active={point.kind === "client"}
            onClick={() =>
              onChange({
                kind: "client",
                query: "",
                lat: null,
                lon: null,
                label: "",
              })
            }
          >
            <Building2 className="size-3.5" />
            {t("pricing.route.pointKindClient")}
          </KindButton>
        </div>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={t("pricing.route.removePoint")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {point.kind === "address" ? (
        <>
          <AddressAutocomplete
            id={`quote-point-${point.id}`}
            label={label}
            hideLabel
            hideMessage
            query={point.query}
            onQueryChange={(text) =>
              onChange({ query: text, label: text, lat: null, lon: null })
            }
            onSelect={(s) =>
              onChange({
                query: s.label,
                label: s.label,
                lat: s.latitude,
                lon: s.longitude,
              })
            }
            biasLat={biasLat}
            biasLon={biasLon}
            placeholder={label}
          />
          {locatedPoint && !point.query && (
            <p className="px-1 text-xs text-muted-foreground">
              {t("pricing.route.pointFromMap", {
                lat: locatedPoint.lat.toFixed(5),
                lon: locatedPoint.lon.toFixed(5),
              })}
            </p>
          )}
        </>
      ) : (
        <>
          <ClientCombobox
            companyId={companyId}
            id={`quote-point-client-${point.id}`}
            label={label}
            value={point.clientId}
            selectedLabel={point.clientName ?? point.clientId}
            onSelect={(c) =>
              onChange({
                clientId: c?.id ?? null,
                clientName: c?.name ?? null,
                clientAddressId: null,
                lat: null,
                lon: null,
                label: c?.name ?? "",
              })
            }
          />
          {point.clientId && addresses.length > 0 && (
            <SelectField
              id={`quote-point-address-${point.id}`}
              label={t("pricing.route.clientAddress")}
              hideLabel
              hideMessage
              value={point.clientAddressId ?? ""}
              onChange={(value) => {
                const a = addresses.find((x) => x.id === value)
                if (a) applyAddress(a)
              }}
              options={addresses.map((a) => ({
                value: a.id,
                label: formatClientAddress(a),
              }))}
              placeholder={t("pricing.route.clientAddress")}
            />
          )}
          {point.clientId && !locatedPoint && (
            <p className="px-1 text-xs text-muted-foreground">
              {t("pricing.route.clientNoCoords")}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function KindButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
