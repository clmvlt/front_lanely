import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Boxes, Package, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { GoodsTypeFormDialog } from "@/components/goods-type-form-dialog"
import { ApiError } from "@/lib/http"
import { getErrorMessage } from "@/lib/api-error"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { CompanyMembership } from "@/features/auth"
import {
  useDeleteGoodsType,
  useInfiniteGoodsTypes,
  type GoodsTypeResponse,
} from "@/features/goods-types"

/** Résumé d'une ligne : emballage, colis, poids, dimensions. */
function summaryParts(type: GoodsTypeResponse, dimsLabel: string): string {
  const parts: string[] = []
  if (type.packagingType) parts.push(type.packagingType)
  if (type.numberOfPackages != null)
    parts.push(`${type.numberOfPackages}x`)
  if (type.grossWeightKg != null) parts.push(`${type.grossWeightKg} kg`)
  if (type.volumeM3 != null) parts.push(`${type.volumeM3} m³`)
  if (type.lengthCm != null || type.widthCm != null || type.heightCm != null) {
    const dims = [type.lengthCm, type.widthCm, type.heightCm]
      .map((d) => (d != null ? d : "-"))
      .join(" x ")
    parts.push(`${dimsLabel} ${dims} cm`)
  }
  return parts.join(" · ")
}

export function CompanyGoodsTypesCard({
  company,
}: {
  company: CompanyMembership
}) {
  const { t } = useTranslation()
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_TRANSPORTS)

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<GoodsTypeResponse | null>(null)
  const [toDelete, setToDelete] = useState<GoodsTypeResponse | null>(null)

  const types = useInfiniteGoodsTypes(companyId, {
    q: debouncedSearch || undefined,
    sort: "name,asc",
    size: 20,
  })
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = types
  const rows = types.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = types.data?.pages[0]?.totalElements ?? rows.length

  const deleteType = useDeleteGoodsType(companyId)

  const askDelete = (type: GoodsTypeResponse) => {
    deleteType.reset()
    setToDelete(type)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteType.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <CardTitle className="text-base">{t("goodsTypes.title")}</CardTitle>
          <CardDescription>{t("goodsTypes.description")}</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus />
            {t("goodsTypes.create")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("goodsTypes.searchPlaceholder")}
            className="pl-9"
            aria-label={t("goodsTypes.searchPlaceholder")}
          />
        </div>

        {types.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(types.error)}</AlertDescription>
          </Alert>
        )}

        {types.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {!types.isLoading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Boxes className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? t("goodsTypes.noResults") : t("goodsTypes.empty")}
            </p>
          </div>
        )}

        {rows.map((type) => {
          const summary = summaryParts(type, t("goodsTypes.dims"))
          return (
            <div
              key={type.id}
              className="flex flex-wrap items-center gap-3 rounded-md border p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Package className="size-4" />
              </span>
              <div className="min-w-0 flex-1 basis-48">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {type.name}
                  </p>
                  {type.dangerousGoods && (
                    <span className="rounded-full bg-[var(--status-failed-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-failed-text)]">
                      {t("waybills.goods.dangerousGoods")}
                      {type.unNumber ? ` · ${type.unNumber}` : ""}
                    </span>
                  )}
                </div>
                {type.description && (
                  <p className="truncate text-xs text-muted-foreground">
                    {type.description}
                  </p>
                )}
                {summary && (
                  <p className="truncate text-xs text-muted-foreground">
                    {summary}
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(type)}
                  >
                    <Pencil />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => askDelete(type)}
                    aria-label={t("goodsTypes.delete")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
          )
        })}

        {rows.length > 0 && (
          <div className="flex flex-col items-center gap-2 pt-1">
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                loading={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {t("goodsTypes.loadMore")}
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              {t("goodsTypes.loaded", {
                loaded: rows.length,
                total: totalElements,
              })}
            </p>
          </div>
        )}
      </CardContent>

      <GoodsTypeFormDialog
        companyId={companyId}
        open={creating || editing !== null}
        goodsType={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteType.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("goodsTypes.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("goodsTypes.deleteBody", { name: toDelete?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {deleteType.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteType.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteType.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteType.isPending}
              onClick={confirmDelete}
            >
              {t("goodsTypes.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
