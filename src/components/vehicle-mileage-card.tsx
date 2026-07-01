import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Gauge, Plus } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { TextareaField } from "@/components/textarea-field"
import { getErrorMessage } from "@/lib/api-error"
import {
  dateTimeLocalToInstant,
  formatDateTime,
  instantToDateTimeLocal,
} from "@/lib/date"
import { useCompanyMembers } from "@/features/companies"
import {
  useCreateMileage,
  useInfiniteMileage,
  type MileageReadingResponse,
} from "@/features/vehicles"

interface VehicleMileageCardProps {
  companyId: string
  vehicleId: string
}

/** Petit graphe SVG d'évolution du kilométrage (chronologique). */
function MileageChart({ readings }: { readings: MileageReadingResponse[] }) {
  const points = useMemo(() => {
    // L'API renvoie du plus récent au plus ancien → on remet en ordre temporel.
    const sorted = [...readings].sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
    return sorted.map((r) => ({
      x: new Date(r.recordedAt).getTime(),
      y: r.valueKm,
    }))
  }, [readings])

  if (points.length < 2) return null

  const width = 600
  const height = 120
  const padding = 8
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1

  const coords = points.map((p) => {
    const x = padding + ((p.x - minX) / spanX) * (width - 2 * padding)
    const y =
      height - padding - ((p.y - minY) / spanY) * (height - 2 * padding)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-28 w-full"
      role="img"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function VehicleMileageCard({
  companyId,
  vehicleId,
}: VehicleMileageCardProps) {
  const { t } = useTranslation()
  const readings = useInfiniteMileage(companyId, vehicleId)
  const members = useCompanyMembers(companyId)
  const [addOpen, setAddOpen] = useState(false)

  const rows = readings.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = readings.data?.pages[0]?.totalElements ?? rows.length
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = readings

  const memberName = (userId: string | null): string | null => {
    if (!userId) return null
    const member = members.data?.find((m) => m.userId === userId)
    if (!member) return null
    return `${member.firstName} ${member.lastName}`.trim() || member.email
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle className="text-base">
            {t("vehicles.mileage.title")}
          </CardTitle>
          <CardDescription>{t("vehicles.mileage.description")}</CardDescription>
        </div>
        {/* Ajout d'un relevé : autorisé à tout membre (aucune permission). */}
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          {t("vehicles.mileage.add")}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {readings.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(readings.error)}</AlertDescription>
          </Alert>
        )}

        {readings.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {!readings.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("vehicles.mileage.empty")}
          </p>
        )}

        {rows.length >= 2 && (
          <div className="rounded-md border bg-accent/20 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("vehicles.mileage.chartTitle")}
            </p>
            <MileageChart readings={rows} />
          </div>
        )}

        {rows.map((reading, index) => {
          const author = memberName(reading.recordedByUserId)
          // La liste est triée par date décroissante : le 1er = relevé courant.
          const isCurrent = index === 0
          return (
            <div
              key={reading.id}
              className="flex flex-wrap items-center gap-3 rounded-md border p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Gauge className="size-4" />
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900">
                    {reading.valueKm.toLocaleString()} {t("vehicles.mileageUnit")}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-[var(--status-delivered-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-delivered-text)]">
                      {t("vehicles.mileage.current")}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(reading.recordedAt)}
                  {author
                    ? ` · ${t("vehicles.mileage.recordedBy", { name: author })}`
                    : ""}
                </p>
                {reading.note && (
                  <p className="mt-1 text-xs whitespace-pre-wrap text-neutral-700">
                    {reading.note}
                  </p>
                )}
              </div>
            </div>
          )
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            className="self-center"
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {t("vehicles.mileage.pagination.loadingMore")}
          </Button>
        )}

        {rows.length > 0 && !hasNextPage && (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            {t("vehicles.mileage.pagination.loaded", {
              loaded: rows.length,
              total: totalElements,
            })}
          </p>
        )}
      </CardContent>

      <AddMileageDialog
        companyId={companyId}
        vehicleId={vehicleId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </Card>
  )
}

function AddMileageDialog({
  companyId,
  vehicleId,
  open,
  onOpenChange,
}: {
  companyId: string
  vehicleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const createMileage = useCreateMileage(companyId, vehicleId)
  const [valueKm, setValueKm] = useState("")
  const [recordedAt, setRecordedAt] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    if (!open) return
    setValueKm("")
    setRecordedAt(instantToDateTimeLocal())
    setNote("")
    createMileage.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const parsedValue = Number.parseInt(valueKm, 10)
  const instant = dateTimeLocalToInstant(recordedAt)
  const canSubmit =
    !Number.isNaN(parsedValue) && parsedValue >= 0 && instant !== null

  const handleSubmit = async () => {
    if (!canSubmit || !instant) return
    try {
      await createMileage.mutateAsync({
        valueKm: parsedValue,
        recordedAt: instant,
        note: note.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      /* erreur affichée via createMileage.error */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!createMileage.isPending) onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("vehicles.mileage.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("vehicles.mileage.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {createMileage.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(createMileage.error)}
              </AlertDescription>
            </Alert>
          )}

          <FormField
            id="mileageValue"
            type="number"
            min={0}
            label={t("vehicles.mileage.value")}
            value={valueKm}
            onChange={(e) => setValueKm(e.target.value)}
            autoComplete="off"
          />
          <FormField
            id="mileageRecordedAt"
            type="datetime-local"
            label={t("vehicles.mileage.recordedAt")}
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
          />
          <TextareaField
            id="mileageNote"
            label={t("vehicles.mileage.note")}
            placeholder={t("vehicles.mileage.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMileage.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={createMileage.isPending}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {t("vehicles.mileage.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
