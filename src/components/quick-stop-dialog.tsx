import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
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
import { ClientCombobox } from "@/components/client-combobox"
import { MapAddressFields } from "@/components/map-address-fields"
import { getErrorMessage } from "@/lib/api-error"
import {
  addressFieldsToDto,
  emptyAddressFields,
  type AddressFieldsValue,
} from "@/lib/address-fields"
import { useCompanyDetail } from "@/features/companies"
import { useCreateWaybill } from "@/features/waybills"

interface QuickStopDialogProps {
  companyId: string
  tourId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Coordonnée cliquée sur la carte (pré-positionne le point). */
  initialCoord: { latitude: number; longitude: number } | null
}

/**
 * Création rapide d'un arrêt de tournée depuis la carte. Un arrêt = une lettre
 * de voiture : on crée une waybill minimale (donneur d'ordre + destinataire +
 * lieu de livraison) rattachée à la tournée (`tourId`). Le lieu de livraison est
 * pré-positionné sur le point cliqué, ajustable sur la mini-carte et via la
 * recherche d'adresse.
 */
export function QuickStopDialog({
  companyId,
  tourId,
  open,
  onOpenChange,
  initialCoord,
}: QuickStopDialogProps) {
  const { t } = useTranslation()
  const company = useCompanyDetail(companyId)
  const createWaybill = useCreateWaybill(companyId)

  const [clientId, setClientId] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)
  const [consigneeName, setConsigneeName] = useState("")
  const [shipperName, setShipperName] = useState("")
  const [address, setAddress] = useState<AddressFieldsValue>(emptyAddressFields)

  // (Ré)initialise le formulaire à l'ouverture, en posant le point cliqué.
  useEffect(() => {
    if (!open) return
    setClientId(null)
    setClientName(null)
    setConsigneeName("")
    setShipperName(company.data?.name ?? "")
    setAddress({
      ...emptyAddressFields(),
      latitude: initialCoord?.latitude ?? null,
      longitude: initialCoord?.longitude ?? null,
    })
    createWaybill.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCoord, company.data?.name])

  const canSubmit =
    Boolean(clientId) &&
    consigneeName.trim() !== "" &&
    shipperName.trim() !== ""

  const submit = () => {
    if (!clientId || !canSubmit) return
    const { address: dto, location } = addressFieldsToDto(address)
    createWaybill.mutate(
      {
        clientId,
        shipper: { name: shipperName.trim() },
        consignee: { name: consigneeName.trim(), address: dto, location },
        placeOfDelivery: { address: dto, location },
        tourId,
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!createWaybill.isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("tours.quickStop.title")}</DialogTitle>
          <DialogDescription>
            {t("tours.quickStop.description")}
          </DialogDescription>
        </DialogHeader>

        {createWaybill.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(createWaybill.error)}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ClientCombobox
              companyId={companyId}
              id="quickStopClient"
              label={t("tours.quickStop.client")}
              value={clientId}
              selectedLabel={clientName ?? clientId}
              onSelect={(c) => {
                setClientId(c?.id ?? null)
                setClientName(c?.name ?? null)
                if (c?.name && consigneeName.trim() === "")
                  setConsigneeName(c.name)
              }}
            />
            <FormField
              id="quickStopConsignee"
              label={t("tours.quickStop.consignee")}
              value={consigneeName}
              onChange={(e) => setConsigneeName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <FormField
            id="quickStopShipper"
            label={t("tours.quickStop.shipper")}
            hint={t("tours.quickStop.shipperHint")}
            value={shipperName}
            onChange={(e) => setShipperName(e.target.value)}
            autoComplete="off"
          />
          <div className="grid gap-2">
            <p className="text-sm font-medium text-foreground">
              {t("tours.quickStop.delivery")}
            </p>
            <MapAddressFields
              idPrefix="quickStop"
              value={address}
              onChange={setAddress}
              tone="delivery"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createWaybill.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={createWaybill.isPending}
            disabled={!canSubmit}
            onClick={submit}
          >
            {t("tours.quickStop.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
