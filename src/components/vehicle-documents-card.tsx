import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Download,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react"
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
import { SelectField } from "@/components/select-field"
import { ApiError } from "@/lib/http"
import { getErrorMessage } from "@/lib/api-error"
import { formatDate } from "@/lib/date"
import { saveBlob } from "@/lib/download"
import { cn } from "@/lib/utils"
import {
  DOCUMENT_CATEGORIES,
  useDeleteDocument,
  useUploadDocument,
  useVehicleDocumentBlob,
  useVehicleDocuments,
  vehiclesApi,
  type DocumentCategory,
  type VehicleDocumentResponse,
} from "@/features/vehicles"

const MAX_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]
const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,.webp"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/")
}

/** Vignette d'une photo : charge le blob protégé puis crée une object URL. */
function DocumentThumbnail({
  companyId,
  vehicleId,
  doc,
}: {
  companyId: string
  vehicleId: string
  doc: VehicleDocumentResponse
}) {
  const blobQuery = useVehicleDocumentBlob(companyId, vehicleId, doc.id)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const blob = blobQuery.data
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blobQuery.data])

  if (url) {
    return (
      <img
        src={url}
        alt={doc.label ?? doc.originalFilename ?? ""}
        className="size-12 shrink-0 rounded-md object-cover"
      />
    )
  }

  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
      {blobQuery.isLoading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <ImageIcon className="size-5" />
      )}
    </span>
  )
}

interface VehicleDocumentsCardProps {
  companyId: string
  vehicleId: string
  canManage: boolean
}

export function VehicleDocumentsCard({
  companyId,
  vehicleId,
  canManage,
}: VehicleDocumentsCardProps) {
  const { t } = useTranslation()
  const [category, setCategory] = useState<DocumentCategory | "">("")
  const documents = useVehicleDocuments(
    companyId,
    vehicleId,
    category || undefined,
  )
  const deleteDoc = useDeleteDocument(companyId, vehicleId)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [toDelete, setToDelete] = useState<VehicleDocumentResponse | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const categoryOptions = [
    { value: "", label: t("vehicles.documents.allCategories") },
    ...DOCUMENT_CATEGORIES.map((value) => ({
      value,
      label: t(`vehicles.documentCategory.${value}`),
    })),
  ]

  const handleDownload = async (doc: VehicleDocumentResponse) => {
    setDownloadError(null)
    setDownloadingId(doc.id)
    try {
      const blob = await vehiclesApi.downloadDocument(companyId, vehicleId, doc.id)
      saveBlob(blob, doc.originalFilename ?? doc.label ?? doc.id)
    } catch (error) {
      setDownloadError(getErrorMessage(error) ?? t("common.error"))
    } finally {
      setDownloadingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteDoc.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setToDelete(null)
    }
  }

  const docs = documents.data ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle className="text-base">
            {t("vehicles.documents.title")}
          </CardTitle>
          <CardDescription>
            {t("vehicles.documents.description")}
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload />
            {t("vehicles.documents.upload")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="w-full sm:max-w-xs">
          <SelectField
            id="vehicleDocCategoryFilter"
            label={t("vehicles.documents.category")}
            value={category}
            onChange={(v) => setCategory(v as DocumentCategory | "")}
            options={categoryOptions}
          />
        </div>

        {documents.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(documents.error)}
            </AlertDescription>
          </Alert>
        )}

        {downloadError && (
          <Alert variant="destructive">
            <AlertDescription>{downloadError}</AlertDescription>
          </Alert>
        )}

        {documents.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {!documents.isLoading && docs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {category
              ? t("vehicles.documents.emptyCategory")
              : t("vehicles.documents.empty")}
          </p>
        )}

        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
          >
            {isImage(doc.contentType) ? (
              <DocumentThumbnail
                companyId={companyId}
                vehicleId={vehicleId}
                doc={doc}
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <FileText className="size-5" />
              </span>
            )}

            <div className="min-w-0 flex-1 basis-48">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {doc.label ?? doc.originalFilename ?? doc.id}
                </p>
                <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                  {t(`vehicles.documentCategory.${doc.category}`)}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {formatSize(doc.sizeBytes)} ·{" "}
                {t("vehicles.documents.uploadedOn", {
                  date: formatDate(doc.createdAt),
                })}
              </p>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                loading={downloadingId === doc.id}
                onClick={() => handleDownload(doc)}
              >
                <Download />
                <span className="hidden sm:inline">
                  {t("vehicles.documents.download")}
                </span>
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    deleteDoc.reset()
                    setToDelete(doc)
                  }}
                  aria-label={t("vehicles.documents.delete")}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      {canManage && (
        <UploadDialog
          companyId={companyId}
          vehicleId={vehicleId}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
        />
      )}

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteDoc.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("vehicles.documents.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("vehicles.documents.deleteBody", {
                name:
                  toDelete?.label ??
                  toDelete?.originalFilename ??
                  toDelete?.id ??
                  "",
              })}
            </DialogDescription>
          </DialogHeader>

          {deleteDoc.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteDoc.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteDoc.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteDoc.isPending}
              onClick={confirmDelete}
            >
              {t("vehicles.documents.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function UploadDialog({
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
  const upload = useUploadDocument(companyId, vehicleId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<DocumentCategory>("REGISTRATION_CARD")
  const [label, setLabel] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!open) return
    setFile(null)
    setCategory("REGISTRATION_CARD")
    setLabel("")
    setLocalError(null)
    setDragging(false)
    upload.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const validate = (candidate: File): string | null => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      return t("vehicles.documents.unsupportedType")
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      return t("vehicles.documents.fileTooLarge")
    }
    return null
  }

  const pickFile = (candidate: File | undefined | null) => {
    if (!candidate) return
    const error = validate(candidate)
    if (error) {
      setLocalError(error)
      setFile(null)
      return
    }
    setLocalError(null)
    setFile(candidate)
  }

  const categoryOptions = DOCUMENT_CATEGORIES.map((value) => ({
    value,
    label: t(`vehicles.documentCategory.${value}`),
  }))

  const handleSubmit = async () => {
    if (!file) {
      setLocalError(t("vehicles.documents.fileRequired"))
      return
    }
    try {
      await upload.mutateAsync({
        file,
        category,
        label: label.trim() || undefined,
      })
      onOpenChange(false)
    } catch {
      /* erreur affichée via upload.error */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!upload.isPending) onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("vehicles.documents.uploadTitle")}</DialogTitle>
          <DialogDescription>
            {t("vehicles.documents.uploadDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {(localError || upload.isError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {localError ?? getErrorMessage(upload.error)}
              </AlertDescription>
            </Alert>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pickFile(e.dataTransfer.files?.[0])
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              dragging
                ? "border-ring bg-accent/50"
                : "border-input hover:bg-accent/30",
            )}
          >
            <Upload className="size-6 text-muted-foreground" />
            {file ? (
              <span className="font-medium text-neutral-900">{file.name}</span>
            ) : (
              <span className="text-muted-foreground">
                {t("vehicles.documents.dropHint")}{" "}
                <span className="font-medium text-brand-800 underline-offset-2">
                  {t("vehicles.documents.browse")}
                </span>
              </span>
            )}
            {file && (
              <span className="text-xs text-muted-foreground">
                {formatSize(file.size)}
              </span>
            )}
          </button>

          <SelectField
            id="uploadCategory"
            label={t("vehicles.documents.category")}
            value={category}
            onChange={(v) => setCategory(v as DocumentCategory)}
            options={categoryOptions}
          />

          <FormField
            id="uploadLabel"
            label={t("vehicles.documents.label")}
            placeholder={t("vehicles.documents.labelPlaceholder")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={upload.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            loading={upload.isPending}
            disabled={!file}
            onClick={handleSubmit}
          >
            {t("vehicles.documents.uploadAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
