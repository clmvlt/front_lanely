import { useEffect, useRef, useState } from "react"
import type * as React from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Calculator, Package, Pencil, Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/form-field"
import { SelectField } from "@/components/select-field"
import { TextareaField } from "@/components/textarea-field"
import { CheckboxField } from "@/components/checkbox-field"
import { ClientCombobox } from "@/components/client-combobox"
import { GoodsTypeCombobox } from "@/components/goods-type-combobox"
import { AddressFields } from "@/components/address-fields"
import { MapAddressFields } from "@/components/map-address-fields"
import { WaybillRouteSection } from "@/components/waybill-route-section"
import {
  addressFieldsFromDto,
  addressFieldsToDto,
  emptyAddressFields,
  type AddressFieldsValue,
} from "@/lib/address-fields"
import { cn } from "@/lib/utils"
import { getErrorMessage, getFieldErrors } from "@/lib/api-error"
import { ApiError } from "@/lib/http"
import {
  dateTimeLocalToInstant,
  instantToDateTimeLocal,
} from "@/lib/date"
import {
  useClient,
  type ClientAddressResponse,
  type ClientSummaryResponse,
} from "@/features/clients"
import {
  useCreateWaybill,
  useUpdateWaybill,
  WAYBILL_SCOPES,
  type CreateWaybillRequest,
  type GoodsLineDto,
  type PlaceDto,
  type PlaceResponse,
  type RouteInputDto,
  type UpdateWaybillRequest,
  type WaybillPartyDto,
  type WaybillPartyResponse,
  type WaybillResponse,
  type WaybillScope,
} from "@/features/waybills"
import { useQuoteMutation } from "@/features/pricing"
import type { CoordinateDto } from "@/lib/transport-types"
import type { GoodsTypeResponse } from "@/features/goods-types"

// --- État des parties --------------------------------------------------------

interface PartyState {
  mode: "client" | "free"
  clientId: string | null
  clientName: string | null
  name: string
  address: AddressFieldsValue
  contactName: string
  contactPhone: string
  contactEmail: string
  legalName: string
  registrationNumber: string
  vatNumber: string
  legalForm: string
}

function emptyParty(): PartyState {
  return {
    // Mode "client existant" par défaut : le chemin le plus rapide (un simple
    // sélecteur). On bascule en saisie libre pour un destinataire ponctuel.
    mode: "client",
    clientId: null,
    clientName: null,
    name: "",
    address: emptyAddressFields(),
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    legalName: "",
    registrationNumber: "",
    vatNumber: "",
    legalForm: "",
  }
}

function partyFromResponse(party?: WaybillPartyResponse | null): PartyState {
  if (!party) return emptyParty()
  const legal = party.legalInfo
  return {
    mode: party.clientId ? "client" : "free",
    clientId: party.clientId ?? null,
    clientName: party.clientId ? party.name : null,
    name: party.name ?? "",
    address: addressFieldsFromDto(party.address, party.location),
    contactName: party.contactName ?? "",
    contactPhone: party.contactPhone ?? "",
    contactEmail: party.contactEmail ?? "",
    legalName: legal?.legalName ?? "",
    registrationNumber: legal?.registrationNumber ?? "",
    vatNumber: legal?.vatNumber ?? "",
    legalForm: legal?.legalForm ?? "",
  }
}

function nz(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function nzNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number.parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

function partyHasName(p: PartyState): boolean {
  return p.mode === "client" ? Boolean(p.clientId) : p.name.trim().length > 0
}

function partyToDto(p: PartyState): WaybillPartyDto | null {
  if (p.mode === "client") {
    if (!p.clientId) return null
    return {
      name: (p.clientName ?? p.name).trim() || "-",
      clientId: p.clientId,
    }
  }
  const name = p.name.trim()
  if (!name) return null
  const { address, location } = addressFieldsToDto(p.address)
  const legalInfo = {
    legalName: nz(p.legalName),
    registrationNumber: nz(p.registrationNumber),
    vatNumber: nz(p.vatNumber),
    legalForm: nz(p.legalForm),
  }
  const hasLegal = Object.values(legalInfo).some((v) => v !== null)
  return {
    name,
    address: address ?? undefined,
    location: location ?? undefined,
    contactName: nz(p.contactName),
    contactPhone: nz(p.contactPhone),
    contactEmail: nz(p.contactEmail),
    legalInfo: hasLegal ? legalInfo : undefined,
  }
}

// --- Section d'une partie ----------------------------------------------------

interface PartySectionProps {
  companyId: string
  role: "shipper" | "consignee"
  value: PartyState
  onChange: (next: PartyState) => void
  fieldErrors: Record<string, string>
  disabled?: boolean
}

function PartySection({
  companyId,
  role,
  value,
  onChange,
  fieldErrors,
  disabled,
}: PartySectionProps) {
  const { t } = useTranslation()
  const patch = (partial: Partial<PartyState>) =>
    onChange({ ...value, ...partial })

  const onSelectClient = (selected: ClientSummaryResponse | null) => {
    if (!selected) {
      patch({ clientId: null, clientName: null })
      return
    }
    patch({ clientId: selected.id, clientName: selected.name })
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">
          {t(`waybills.parties.${role}`)}
          <span className="ml-1 text-destructive">*</span>
        </h3>
        <div className="flex items-center gap-1 rounded-md bg-accent p-0.5 text-xs">
          {(["client", "free"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => patch({ mode })}
              className={
                value.mode === mode
                  ? "rounded px-2 py-1 font-medium bg-card text-foreground shadow-xs"
                  : "rounded px-2 py-1 text-muted-foreground hover:text-foreground"
              }
            >
              {t(`waybills.parties.mode.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {value.mode === "client" ? (
        <ClientCombobox
          companyId={companyId}
          id={`${role}-client`}
          label={t("waybills.parties.client")}
          value={value.clientId}
          selectedLabel={value.clientName}
          onSelect={onSelectClient}
          disabled={disabled}
          error={fieldErrors[`${role}.name`] ?? fieldErrors[`${role}.clientId`]}
        />
      ) : (
        <>
          <FormField
            id={`${role}-name`}
            label={t("waybills.parties.name")}
            placeholder={t("waybills.parties.namePlaceholder")}
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            error={fieldErrors[`${role}.name`]}
            disabled={disabled}
            autoComplete="off"
          />
          <AddressFields
            idPrefix={role}
            value={value.address}
            onChange={(address) => patch({ address })}
            disabled={disabled}
            errorPrefix={`${role}.address`}
            fieldErrors={fieldErrors}
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id={`${role}-contactName`}
              label={t("waybills.parties.contactName")}
              value={value.contactName}
              onChange={(e) => patch({ contactName: e.target.value })}
              disabled={disabled}
              autoComplete="off"
            />
            <FormField
              id={`${role}-contactPhone`}
              label={t("waybills.parties.contactPhone")}
              value={value.contactPhone}
              onChange={(e) => patch({ contactPhone: e.target.value })}
              disabled={disabled}
              autoComplete="off"
            />
          </div>
          <FormField
            id={`${role}-contactEmail`}
            type="email"
            label={t("waybills.parties.contactEmail")}
            placeholder={t("common.placeholders.email")}
            value={value.contactEmail}
            onChange={(e) => patch({ contactEmail: e.target.value })}
            disabled={disabled}
            autoComplete="off"
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FormField
              id={`${role}-legalName`}
              label={t("clients.fields.legalName")}
              value={value.legalName}
              onChange={(e) => patch({ legalName: e.target.value })}
              disabled={disabled}
              autoComplete="off"
            />
            <FormField
              id={`${role}-vatNumber`}
              label={t("clients.fields.vatNumber")}
              value={value.vatNumber}
              onChange={(e) => patch({ vatNumber: e.target.value })}
              disabled={disabled}
              autoComplete="off"
            />
          </div>
        </>
      )}
    </div>
  )
}

// --- Lieux -------------------------------------------------------------------

/**
 * État d'un point (enlèvement / livraison). L'adresse est toujours saisissable
 * (champs + carte) ; quand la partie associée est un client, une liste de ses
 * adresses permet de pré-remplir ces champs. On ne stocke donc qu'une adresse
 * matérialisée + la date prévue. Le rattachement au client (s'il y en a un) est
 * hérité de la partie au moment de la soumission.
 */
interface PlaceState {
  address: AddressFieldsValue
  plannedAt: string
}

function emptyPlace(): PlaceState {
  return { address: emptyAddressFields(), plannedAt: "" }
}

function placeFromResponse(place?: PlaceResponse | null): PlaceState {
  if (!place) return emptyPlace()
  return {
    address: addressFieldsFromDto(place.address, place.location),
    plannedAt: place.plannedAt ? instantToDateTimeLocal(place.plannedAt) : "",
  }
}

/**
 * `clientId` = client hérité de la partie associée (null si partie libre).
 * L'adresse matérialisée est toujours envoyée (saisie ou pré-remplie depuis une
 * adresse du client) ; le `clientId` ne fait que conserver le lien.
 */
function placeToDto(p: PlaceState, clientId: string | null): PlaceDto | null {
  const plannedAt = dateTimeLocalToInstant(p.plannedAt)
  const { address, location } = addressFieldsToDto(p.address)

  if (clientId) {
    if (!address && !location && !plannedAt) return { clientId }
    return {
      clientId,
      address: address ?? undefined,
      location: location ?? undefined,
      plannedAt: plannedAt ?? undefined,
    }
  }

  if (!address && !location && !plannedAt) return null
  return {
    address: address ?? undefined,
    location: location ?? undefined,
    plannedAt: plannedAt ?? undefined,
  }
}

// --- Section d'un point ------------------------------------------------------

interface PlaceSectionProps {
  companyId: string
  kind: "takingOver" | "delivery"
  value: PlaceState
  onChange: (next: PlaceState) => void
  errorPrefix: string
  fieldErrors: Record<string, string>
  /** Client hérité de la partie associée (null = partie en saisie libre). */
  clientId: string | null
}

function PlaceSection({
  companyId,
  kind,
  value,
  onChange,
  errorPrefix,
  fieldErrors,
  clientId,
}: PlaceSectionProps) {
  const { t } = useTranslation()
  const patch = (partial: Partial<PlaceState>) =>
    onChange({ ...value, ...partial })

  // Partie cliente : on liste ses adresses pour pré-remplir les champs/carte.
  const linked = Boolean(clientId)
  const client = useClient(companyId, clientId ?? "")
  const clientAddresses = client.data?.addresses ?? []
  const [picked, setPicked] = useState("")

  const fillFromAddress = (addr: ClientAddressResponse) => {
    const a = addr.address
    setPicked(addr.id)
    patch({
      address: {
        search:
          addr.label || [a.line1, a.city].filter(Boolean).join(", ") || "",
        line1: a.line1 ?? "",
        line2: a.line2 ?? "",
        postalCode: a.postalCode ?? "",
        city: a.city ?? "",
        state: a.state ?? "",
        country: a.country ?? "",
        latitude: addr.latitude ?? null,
        longitude: addr.longitude ?? null,
      },
    })
  }

  // Choisir une adresse du client recopie tout (adresse + GPS) dans la saisie,
  // qui reste librement modifiable ensuite.
  const onPickClientAddress = (id: string) => {
    const addr = clientAddresses.find((a) => a.id === id)
    if (addr) fillFromAddress(addr)
    else setPicked(id)
  }

  // À la sélection d'un client (changement de `clientId`), on renseigne par
  // défaut son adresse favorite (principale, puis livraison par défaut). On ne
  // touche pas au montage initial (édition d'une lettre existante préservée).
  const prevClientId = useRef(clientId)
  useEffect(() => {
    if (clientId === prevClientId.current) return
    if (clientId && !client.data) return // attendre les adresses de ce client
    prevClientId.current = clientId
    setPicked("")
    if (!clientId) return
    const addrs = client.data?.addresses ?? []
    const favorite =
      addrs.find((a) => a.isPrimary) ??
      addrs.find((a) => a.isDefaultShipping) ??
      addrs[0]
    if (favorite) fillFromAddress(favorite)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, client.data])

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <h3 className="text-sm font-medium text-foreground">
        {t(`waybills.places.${kind}`)}
      </h3>

      {linked && clientAddresses.length > 0 && (
        <SelectField
          id={`${kind}-client-address`}
          label={t("waybills.places.clientAddress")}
          value={picked}
          onChange={onPickClientAddress}
          options={clientAddresses.map((a) => ({
            value: a.id,
            label:
              [a.label, a.address.city, a.address.postalCode]
                .filter(Boolean)
                .join(" · ") || t(`clients.addressType.${a.type}`),
          }))}
          placeholder={t("waybills.places.prefillFromClient")}
        />
      )}

      <MapAddressFields
        idPrefix={kind}
        value={value.address}
        onChange={(address) => patch({ address })}
        errorPrefix={`${errorPrefix}.address`}
        fieldErrors={fieldErrors}
        tone={kind === "takingOver" ? "pickup" : "delivery"}
      />

      <FormField
        id={`${kind}-plannedAt`}
        type="datetime-local"
        label={t(
          kind === "takingOver"
            ? "waybills.places.plannedAtTakingOver"
            : "waybills.places.plannedAtDelivery",
        )}
        value={value.plannedAt}
        onChange={(e) => patch({ plannedAt: e.target.value })}
        autoComplete="off"
      />
    </div>
  )
}

// --- Marchandises ------------------------------------------------------------

interface GoodsLineState {
  description: string
  packagingType: string
  numberOfPackages: string
  grossWeightKg: string
  volumeM3: string
  lengthCm: string
  widthCm: string
  heightCm: string
  dangerousGoods: boolean
  unNumber: string
}

function emptyGoodsLine(): GoodsLineState {
  return {
    description: "",
    packagingType: "",
    numberOfPackages: "",
    grossWeightKg: "",
    volumeM3: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    dangerousGoods: false,
    unNumber: "",
  }
}

/**
 * Pré-remplit une ligne depuis un type du catalogue : le nom écrase la
 * description, les autres valeurs ne remplacent que les champs vides (on ne
 * perd pas une saisie déjà faite). Texte libre, aucun lien stocké.
 */
function applyGoodsType(
  line: GoodsLineState,
  type: GoodsTypeResponse,
): GoodsLineState {
  const keep = (current: string, fallback: number | null | undefined) =>
    current.trim() !== "" ? current : fallback != null ? String(fallback) : ""
  return {
    ...line,
    description: type.name,
    packagingType: line.packagingType.trim() || type.packagingType || "",
    numberOfPackages: keep(line.numberOfPackages, type.numberOfPackages),
    grossWeightKg: keep(line.grossWeightKg, type.grossWeightKg),
    volumeM3: keep(line.volumeM3, type.volumeM3),
    lengthCm: keep(line.lengthCm, type.lengthCm),
    widthCm: keep(line.widthCm, type.widthCm),
    heightCm: keep(line.heightCm, type.heightCm),
    dangerousGoods: type.dangerousGoods || line.dangerousGoods,
    unNumber: line.unNumber.trim() || type.unNumber || "",
  }
}

function goodsLineToDto(line: GoodsLineState): GoodsLineDto | null {
  const description = line.description.trim()
  if (!description) return null
  return {
    description,
    packagingType: nz(line.packagingType),
    numberOfPackages: nzNumber(line.numberOfPackages) ?? undefined,
    grossWeightKg: nzNumber(line.grossWeightKg) ?? undefined,
    volumeM3: nzNumber(line.volumeM3) ?? undefined,
    lengthCm: nzNumber(line.lengthCm) ?? undefined,
    widthCm: nzNumber(line.widthCm) ?? undefined,
    heightCm: nzNumber(line.heightCm) ?? undefined,
    dangerousGoods: line.dangerousGoods,
    unNumber: line.dangerousGoods ? nz(line.unNumber) : null,
  }
}

/** Résumé compact d'une ligne pour la liste repliée (chips séparées par « · »). */
function goodsLineSummary(line: GoodsLineState, t: TFunction): string {
  const parts: string[] = []
  const packages = line.numberOfPackages.trim()
  const packaging = line.packagingType.trim()
  if (packages && packaging) parts.push(`${packages} × ${packaging}`)
  else if (packages) parts.push(`${packages} ${t("waybills.goods.numberOfPackages").toLowerCase()}`)
  else if (packaging) parts.push(packaging)
  if (line.grossWeightKg.trim()) parts.push(`${line.grossWeightKg.trim()} kg`)
  if (line.volumeM3.trim()) parts.push(`${line.volumeM3.trim()} m³`)
  const dims = [line.lengthCm, line.widthCm, line.heightCm].map((v) => v.trim())
  if (dims.some(Boolean))
    parts.push(`${dims.map((v) => v || "?").join(" × ")} cm`)
  return parts.join("  ·  ")
}

// --- Marchandises : éditeur d'une ligne --------------------------------------

interface GoodsLineEditorProps {
  companyId: string
  index: number
  line: GoodsLineState
  fieldErrors: Record<string, string>
  onChange: (partial: Partial<GoodsLineState>) => void
  onApplyType: (type: GoodsTypeResponse) => void
  onRemove: () => void
  onDone: () => void
}

function GoodsLineEditor({
  companyId,
  index,
  line,
  fieldErrors,
  onChange,
  onApplyType,
  onRemove,
  onDone,
}: GoodsLineEditorProps) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground">
          {line.description.trim() || t("waybills.goods.itemTitle")}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          aria-label={t("waybills.goods.remove")}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <GoodsTypeCombobox
        companyId={companyId}
        id={`goods-${index}-description`}
        label={t("waybills.goods.description")}
        value={line.description}
        onChange={(description) => onChange({ description })}
        onSelectType={onApplyType}
        error={fieldErrors[`goodsLines[${index}].description`]}
      />
      <div className="grid gap-x-4 sm:grid-cols-3">
        <FormField
          id={`goods-${index}-packaging`}
          label={t("waybills.goods.packagingType")}
          value={line.packagingType}
          onChange={(e) => onChange({ packagingType: e.target.value })}
          autoComplete="off"
        />
        <FormField
          id={`goods-${index}-packages`}
          type="number"
          min={0}
          label={t("waybills.goods.numberOfPackages")}
          value={line.numberOfPackages}
          onChange={(e) => onChange({ numberOfPackages: e.target.value })}
          autoComplete="off"
        />
        <FormField
          id={`goods-${index}-weight`}
          type="number"
          step="any"
          min={0}
          label={t("waybills.goods.grossWeightKg")}
          value={line.grossWeightKg}
          onChange={(e) => onChange({ grossWeightKg: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-x-4 sm:grid-cols-4">
        <FormField
          id={`goods-${index}-volume`}
          type="number"
          step="any"
          min={0}
          label={t("waybills.goods.volumeM3")}
          value={line.volumeM3}
          onChange={(e) => onChange({ volumeM3: e.target.value })}
          autoComplete="off"
        />
        <FormField
          id={`goods-${index}-length`}
          type="number"
          step="any"
          min={0}
          label={t("waybills.goods.lengthCm")}
          value={line.lengthCm}
          onChange={(e) => onChange({ lengthCm: e.target.value })}
          autoComplete="off"
        />
        <FormField
          id={`goods-${index}-width`}
          type="number"
          step="any"
          min={0}
          label={t("waybills.goods.widthCm")}
          value={line.widthCm}
          onChange={(e) => onChange({ widthCm: e.target.value })}
          autoComplete="off"
        />
        <FormField
          id={`goods-${index}-height`}
          type="number"
          step="any"
          min={0}
          label={t("waybills.goods.heightCm")}
          value={line.heightCm}
          onChange={(e) => onChange({ heightCm: e.target.value })}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <CheckboxField
          id={`goods-${index}-dangerous`}
          label={t("waybills.goods.dangerousGoods")}
          checked={line.dangerousGoods}
          onCheckedChange={(dangerousGoods) => onChange({ dangerousGoods })}
        />
        {line.dangerousGoods && (
          <div className="min-w-0 flex-1 basis-40">
            <FormField
              id={`goods-${index}-un`}
              label={t("waybills.goods.unNumber")}
              value={line.unNumber}
              onChange={(e) => onChange({ unNumber: e.target.value })}
              autoComplete="off"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onDone}>
          {t("waybills.goods.done")}
        </Button>
      </div>
    </div>
  )
}

// --- Marchandises : étape (liste repliée + éditeur) --------------------------

interface WaybillGoodsStepProps {
  companyId: string
  lines: GoodsLineState[]
  fieldErrors: Record<string, string>
  onUpdate: (index: number, partial: Partial<GoodsLineState>) => void
  onApplyType: (index: number, type: GoodsTypeResponse) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

function WaybillGoodsStep({
  companyId,
  lines,
  fieldErrors,
  onUpdate,
  onApplyType,
  onAdd,
  onRemove,
}: WaybillGoodsStepProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<number | null>(null)

  // Index de la première ligne en erreur côté API (ex. description manquante).
  const erroredIndex = (() => {
    for (let i = 0; i < lines.length; i++)
      if (
        Object.keys(fieldErrors).some((k) => k.startsWith(`goodsLines[${i}]`))
      )
        return i
    return null
  })()

  // Une erreur de validation ouvre la ligne concernée (sinon elle reste cachée).
  useEffect(() => {
    if (erroredIndex !== null) setEditing(erroredIndex)
  }, [erroredIndex])

  const add = () => {
    onAdd()
    setEditing(lines.length)
  }

  const done = (index: number) => {
    // Une ligne sans description ne sera pas enregistrée : on la retire pour
    // garder la liste propre.
    if (!lines[index]?.description.trim()) onRemove(index)
    setEditing(null)
  }

  const remove = (index: number) => {
    onRemove(index)
    setEditing(null)
  }

  if (editing !== null && lines[editing]) {
    return (
      <section className="grid gap-3">
        <GoodsLineEditor
          companyId={companyId}
          index={editing}
          line={lines[editing]}
          fieldErrors={fieldErrors}
          onChange={(partial) => onUpdate(editing, partial)}
          onApplyType={(type) => onApplyType(editing, type)}
          onRemove={() => remove(editing)}
          onDone={() => done(editing)}
        />
      </section>
    )
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {t("waybills.goods.title")}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus />
          {t("waybills.goods.add")}
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
          <Package className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("waybills.goods.empty")}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus />
            {t("waybills.goods.add")}
          </Button>
        </div>
      ) : (
        <ul className="grid gap-2">
          {lines.map((line, index) => {
            const summary = goodsLineSummary(line, t)
            const hasError = Object.keys(fieldErrors).some((k) =>
              k.startsWith(`goodsLines[${index}]`),
            )
            return (
              <li
                key={index}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-3",
                  hasError && "border-destructive",
                )}
              >
                <button
                  type="button"
                  onClick={() => setEditing(index)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {line.description.trim() ||
                        t("waybills.goods.untitled")}
                    </span>
                    {line.dangerousGoods && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        {t("waybills.goods.dangerousShort")}
                        {line.unNumber.trim() && ` ${line.unNumber.trim()}`}
                      </span>
                    )}
                  </div>
                  {summary && (
                    <p className="truncate text-xs text-muted-foreground">
                      {summary}
                    </p>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  aria-label={t("waybills.goods.edit")}
                  onClick={() => setEditing(index)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  aria-label={t("waybills.goods.remove")}
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// --- Dialogue principal ------------------------------------------------------

interface WaybillFormDialogProps {
  companyId: string
  open: boolean
  /** Lettre à éditer ; `null` = création. */
  waybill: WaybillResponse | null
  onOpenChange: (open: boolean) => void
  onSaved?: (waybill: WaybillResponse) => void
}

interface FormState {
  reference: string
  scope: WaybillScope
  clientId: string | null
  clientName: string | null
  shipper: PartyState
  consignee: PartyState
  placeOfTakingOver: PlaceState
  placeOfDelivery: PlaceState
  route: RouteInputDto | null
  goodsLines: GoodsLineState[]
  carriageChargesAmount: string
  carriageChargesCurrency: string
  senderInstructions: string
  attachedDocuments: string
  reservationsAndObservations: string
  notes: string
}

function emptyForm(): FormState {
  return {
    reference: "",
    scope: "NATIONAL",
    clientId: null,
    clientName: null,
    shipper: emptyParty(),
    consignee: emptyParty(),
    placeOfTakingOver: emptyPlace(),
    placeOfDelivery: emptyPlace(),
    route: null,
    goodsLines: [],
    carriageChargesAmount: "",
    carriageChargesCurrency: "EUR",
    senderInstructions: "",
    attachedDocuments: "",
    reservationsAndObservations: "",
    notes: "",
  }
}

function toFormState(w: WaybillResponse): FormState {
  return {
    reference: w.reference ?? "",
    scope: w.scope,
    clientId: w.clientId ?? null,
    clientName: w.clientName ?? null,
    shipper: partyFromResponse(w.shipper),
    consignee: partyFromResponse(w.consignee),
    placeOfTakingOver: placeFromResponse(w.placeOfTakingOver),
    placeOfDelivery: placeFromResponse(w.placeOfDelivery),
    route: null,
    goodsLines:
      w.goodsLines.length > 0
        ? w.goodsLines.map((g) => ({
            description: g.description ?? "",
            packagingType: g.packagingType ?? "",
            numberOfPackages:
              g.numberOfPackages != null ? String(g.numberOfPackages) : "",
            grossWeightKg:
              g.grossWeightKg != null ? String(g.grossWeightKg) : "",
            volumeM3: g.volumeM3 != null ? String(g.volumeM3) : "",
            lengthCm: g.lengthCm != null ? String(g.lengthCm) : "",
            widthCm: g.widthCm != null ? String(g.widthCm) : "",
            heightCm: g.heightCm != null ? String(g.heightCm) : "",
            dangerousGoods: Boolean(g.dangerousGoods),
            unNumber: g.unNumber ?? "",
          }))
        : [],
    carriageChargesAmount:
      w.carriageChargesAmount != null ? String(w.carriageChargesAmount) : "",
    carriageChargesCurrency: w.carriageChargesCurrency ?? "EUR",
    senderInstructions: w.senderInstructions ?? "",
    attachedDocuments: w.attachedDocuments ?? "",
    reservationsAndObservations: w.reservationsAndObservations ?? "",
    notes: w.notes ?? "",
  }
}

export function WaybillFormDialog({
  companyId,
  open,
  waybill,
  onOpenChange,
  onSaved,
}: WaybillFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = waybill !== null
  const createWaybill = useCreateWaybill(companyId)
  const updateWaybill = useUpdateWaybill(companyId, waybill?.id ?? "")
  const mutation = isEdit ? updateWaybill : createWaybill

  const [form, setForm] = useState<FormState>(emptyForm)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!open) return
    setForm(waybill ? toFormState(waybill) : emptyForm())
    setStep(0)
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, waybill])

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value }))

  const fieldErrors = getFieldErrors(mutation.error)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const isConflict =
    mutation.error instanceof ApiError && mutation.error.status === 409
  // 400 sans erreurs de champ : typiquement une adresse de point non géocodable
  // (error.geocoding.address-not-found) -> on guide vers la saisie GPS manuelle.
  const isBadRequest =
    mutation.error instanceof ApiError && mutation.error.status === 400
  const referenceError =
    fieldErrors.reference ??
    (isConflict ? (getErrorMessage(mutation.error) ?? undefined) : undefined)

  const scopeOptions = WAYBILL_SCOPES.map((s) => ({
    value: s,
    label: t(`waybills.scope.${s}`),
  }))

  // Calcul auto du prix : agrège les quantités du formulaire (distance de
  // l'itinéraire, poids/colis/volume des lignes, 1 arrêt) et résout la grille
  // via le client. Le montant reste librement modifiable ensuite.
  const quoteEstimate = useQuoteMutation(companyId)
  const sumGoods = (key: "grossWeightKg" | "volumeM3" | "numberOfPackages") =>
    form.goodsLines.reduce((acc, line) => acc + (nzNumber(line[key]) ?? 0), 0)

  const handleAutoPrice = async () => {
    const distanceMeters = form.route?.distanceMeters
    try {
      const quote = await quoteEstimate.mutateAsync({
        tariffId: null,
        clientId: form.clientId,
        inputs: {
          distanceKm:
            distanceMeters != null ? distanceMeters / 1000 : null,
          totalWeightKg: sumGoods("grossWeightKg") || null,
          totalVolumeM3: sumGoods("volumeM3") || null,
          packageCount: sumGoods("numberOfPackages") || null,
          stopCount: 1,
        },
      })
      setForm((prev) => ({
        ...prev,
        carriageChargesAmount: String(quote.total),
        carriageChargesCurrency: quote.currency,
      }))
    } catch {
      /* erreur affichée via quoteEstimate.error */
    }
  }

  useEffect(() => {
    if (open) quoteEstimate.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, waybill])

  const updateGoodsLine = (index: number, partial: Partial<GoodsLineState>) =>
    setForm((prev) => ({
      ...prev,
      goodsLines: prev.goodsLines.map((line, i) =>
        i === index ? { ...line, ...partial } : line,
      ),
    }))
  const addGoodsLine = () =>
    setForm((prev) => ({
      ...prev,
      goodsLines: [...prev.goodsLines, emptyGoodsLine()],
    }))
  const removeGoodsLine = (index: number) =>
    setForm((prev) => ({
      ...prev,
      goodsLines: prev.goodsLines.filter((_, i) => i !== index),
    }))

  // Client hérité par le lieu depuis sa partie (null si la partie est en libre).
  const partyClientId = (p: PartyState) =>
    p.mode === "client" ? p.clientId : null
  const shipperClientId = partyClientId(form.shipper)
  const consigneeClientId = partyClientId(form.consignee)

  const coordFrom = (a: AddressFieldsValue): CoordinateDto | null =>
    typeof a.latitude === "number" && typeof a.longitude === "number"
      ? { latitude: a.latitude, longitude: a.longitude }
      : null
  const pickupCoord = coordFrom(form.placeOfTakingOver.address)
  const deliveryCoord = coordFrom(form.placeOfDelivery.address)
  const partyDisplayName = (p: PartyState, fallback: string) =>
    (p.mode === "client" ? p.clientName : p.name)?.trim() || fallback

  const canSubmit =
    (isEdit || Boolean(form.clientId)) &&
    partyHasName(form.shipper) &&
    partyHasName(form.consignee)

  const STEPS = [
    { key: "order", label: t("waybills.form.steps.order") },
    { key: "shipper", label: t("waybills.form.steps.shipper") },
    { key: "consignee", label: t("waybills.form.steps.consignee") },
    { key: "route", label: t("waybills.form.steps.route") },
    { key: "goods", label: t("waybills.form.steps.goods") },
    { key: "cmr", label: t("waybills.form.steps.cmr") },
  ] as const
  const lastStep = STEPS.length - 1

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // Entrée clavier sur une étape intermédiaire : on avance plutôt que valider.
    if (step < lastStep) {
      setStep(step + 1)
      return
    }

    const shipper = partyToDto(form.shipper)
    const consignee = partyToDto(form.consignee)
    if (!shipper || !consignee) return

    const goodsLines = form.goodsLines
      .map(goodsLineToDto)
      .filter((g): g is GoodsLineDto => g !== null)

    const common = {
      reference: nz(form.reference),
      scope: form.scope,
      shipper,
      consignee,
      placeOfTakingOver:
        placeToDto(form.placeOfTakingOver, shipperClientId) ?? undefined,
      placeOfDelivery:
        placeToDto(form.placeOfDelivery, consigneeClientId) ?? undefined,
      route: form.route ?? undefined,
      goodsLines: goodsLines.length > 0 ? goodsLines : undefined,
      carriageChargesAmount: nzNumber(form.carriageChargesAmount) ?? undefined,
      carriageChargesCurrency: nz(form.carriageChargesCurrency) ?? undefined,
      senderInstructions: nz(form.senderInstructions),
      attachedDocuments: nz(form.attachedDocuments),
      reservationsAndObservations: nz(form.reservationsAndObservations),
      notes: nz(form.notes),
    }

    try {
      if (isEdit) {
        await updateWaybill.mutateAsync({
          ...common,
          clientId: form.clientId ?? undefined,
        } as UpdateWaybillRequest)
        onOpenChange(false)
      } else {
        if (!form.clientId) return
        const created = await createWaybill.mutateAsync({
          ...common,
          clientId: form.clientId,
        } as CreateWaybillRequest)
        onSaved?.(created)
        onOpenChange(false)
      }
    } catch {
      /* erreur affichée via mutation.error */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-3xl lg:max-w-5xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {isEdit ? t("waybills.form.editTitle") : t("waybills.form.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("waybills.form.editDescription")
              : t("waybills.form.createDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Fil d'étapes : cliquable pour naviguer librement. */}
        <div className="flex flex-wrap gap-1.5 border-b px-6 py-3">
          {STEPS.map((s, index) => {
            const active = index === step
            const done = index < step
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground hover:bg-accent/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[10px]",
                    active
                      ? "bg-primary-foreground/20"
                      : done
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/60",
                  )}
                >
                  {index + 1}
                </span>
                {s.label}
              </button>
            )
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
            {mutation.isError && !hasFieldErrors && !isConflict && (
              <Alert variant="destructive">
                <AlertDescription className="grid gap-1">
                  <span>{getErrorMessage(mutation.error)}</span>
                  {isBadRequest && (
                    <span className="text-xs opacity-90">
                      {t("waybills.form.geocodingHint")}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <section className={cn("grid gap-4", step !== 0 && "hidden")}>
              <div className="grid gap-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("waybills.client.title")}
                    <span className="ml-1 text-destructive">*</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {t("waybills.client.hint")}
                  </span>
                </div>
                <ClientCombobox
                  companyId={companyId}
                  id="waybillClient"
                  label={t("waybills.client.label")}
                  value={form.clientId}
                  selectedLabel={form.clientName}
                  onSelect={(c) =>
                    setForm((prev) => ({
                      ...prev,
                      clientId: c?.id ?? null,
                      clientName: c?.name ?? null,
                    }))
                  }
                  error={fieldErrors.clientId}
                />
              </div>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <FormField
                  id="waybillReference"
                  label={t("waybills.fields.reference")}
                  placeholder={t("waybills.form.referencePlaceholder")}
                  value={form.reference}
                  onChange={(e) => set("reference")(e.target.value)}
                  error={referenceError}
                  autoComplete="off"
                />
                <SelectField
                  id="waybillScope"
                  label={t("waybills.fields.scope")}
                  value={form.scope}
                  onChange={(v) => set("scope")(v as WaybillScope)}
                  options={scopeOptions}
                  error={fieldErrors.scope}
                />
              </div>
            </section>

            <section className={cn("grid gap-4", step !== 1 && "hidden")}>
              <PartySection
                companyId={companyId}
                role="shipper"
                value={form.shipper}
                onChange={set("shipper")}
                fieldErrors={fieldErrors}
              />
              <PlaceSection
                companyId={companyId}
                kind="takingOver"
                value={form.placeOfTakingOver}
                onChange={set("placeOfTakingOver")}
                errorPrefix="placeOfTakingOver"
                fieldErrors={fieldErrors}
                clientId={shipperClientId}
              />
            </section>

          <section className={cn("grid gap-4", step !== 2 && "hidden")}>
            <PartySection
              companyId={companyId}
              role="consignee"
              value={form.consignee}
              onChange={set("consignee")}
              fieldErrors={fieldErrors}
            />
            <PlaceSection
              companyId={companyId}
              kind="delivery"
              value={form.placeOfDelivery}
              onChange={set("placeOfDelivery")}
              errorPrefix="placeOfDelivery"
              fieldErrors={fieldErrors}
              clientId={consigneeClientId}
            />
          </section>

          <section className={cn(step !== 3 && "hidden")}>
            <WaybillRouteSection
              companyId={companyId}
              active={step === 3}
              pickup={pickupCoord}
              delivery={deliveryCoord}
              pickupPlannedAt={form.placeOfTakingOver.plannedAt}
              deliveryPlannedAt={form.placeOfDelivery.plannedAt}
              pickupLabel={partyDisplayName(
                form.shipper,
                t("waybills.places.takingOver"),
              )}
              deliveryLabel={partyDisplayName(
                form.consignee,
                t("waybills.places.delivery"),
              )}
              initial={waybill?.route}
              value={form.route}
              onChange={set("route")}
            />
          </section>

          <div className={cn(step !== 4 && "hidden")}>
            <WaybillGoodsStep
              companyId={companyId}
              lines={form.goodsLines}
              fieldErrors={fieldErrors}
              onUpdate={updateGoodsLine}
              onApplyType={(index, type) =>
                setForm((prev) => ({
                  ...prev,
                  goodsLines: prev.goodsLines.map((l, i) =>
                    i === index ? applyGoodsType(l, type) : l,
                  ),
                }))
              }
              onAdd={addGoodsLine}
              onRemove={removeGoodsLine}
            />
          </div>

          <section className={cn("grid gap-3", step !== 5 && "hidden")}>
            <h3 className="text-sm font-medium text-foreground">
              {t("waybills.cmr.title")}
            </h3>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <FormField
                id="waybillChargesAmount"
                type="number"
                step="any"
                min={0}
                label={`${t("waybills.cmr.chargesAmount")} (${t("common.taxExcluded")})`}
                value={form.carriageChargesAmount}
                onChange={(e) => set("carriageChargesAmount")(e.target.value)}
                autoComplete="off"
              />
              <FormField
                id="waybillChargesCurrency"
                label={t("waybills.cmr.chargesCurrency")}
                value={form.carriageChargesCurrency}
                onChange={(e) => set("carriageChargesCurrency")(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="-mt-2 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoPrice}
                  loading={quoteEstimate.isPending}
                >
                  <Calculator />
                  {t("waybills.cmr.autoPrice")}
                </Button>
                {quoteEstimate.isSuccess && quoteEstimate.data && (
                  <span className="text-xs text-muted-foreground">
                    {t("waybills.cmr.autoPriceResult", {
                      tariff: quoteEstimate.data.tariffName,
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("waybills.cmr.autoPriceHint")}
              </p>
              {quoteEstimate.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {getErrorMessage(quoteEstimate.error)}
                  </AlertDescription>
                </Alert>
              )}
              {quoteEstimate.data &&
                quoteEstimate.data.warnings.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-[var(--status-transit-text)]">
                    {quoteEstimate.data.warnings.map((w) => (
                      <li key={w}>
                        {t(`pricing.warnings.${w}`, { defaultValue: w })}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <TextareaField
              id="waybillSenderInstructions"
              label={t("waybills.cmr.senderInstructions")}
              value={form.senderInstructions}
              onChange={(e) => set("senderInstructions")(e.target.value)}
              rows={2}
            />
            <TextareaField
              id="waybillReservations"
              label={t("waybills.cmr.reservations")}
              value={form.reservationsAndObservations}
              onChange={(e) => set("reservationsAndObservations")(e.target.value)}
              rows={2}
            />
            <FormField
              id="waybillAttachedDocuments"
              label={t("waybills.cmr.attachedDocuments")}
              value={form.attachedDocuments}
              onChange={(e) => set("attachedDocuments")(e.target.value)}
              autoComplete="off"
            />
            <TextareaField
              id="waybillNotes"
              label={t("waybills.fields.notes")}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={2}
            />
          </section>
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 border-t px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
              disabled={mutation.isPending}
            >
              {step === 0 ? t("common.cancel") : t("waybills.form.back")}
            </Button>
            <div className="flex items-center gap-2">
              {step < lastStep ? (
                <Button
                  key="next"
                  type="button"
                  onClick={() => setStep(step + 1)}
                >
                  {t("waybills.form.next")}
                </Button>
              ) : (
                <Button
                  key="submit"
                  type="submit"
                  loading={mutation.isPending}
                  disabled={!canSubmit}
                >
                  {isEdit ? t("common.save") : t("waybills.form.create")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
