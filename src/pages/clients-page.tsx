import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { Archive, ArchiveRestore, Plus, Search, Trash2 } from "lucide-react"
import { CompanyShell } from "@/components/company-shell"
import { Card, CardContent } from "@/components/ui/card"
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
import { getErrorMessage } from "@/lib/api-error"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import type { CompanyMembership } from "@/features/auth"
import {
  useArchiveClient,
  useDeleteClient,
  useInfiniteClients,
  useRestoreClient,
  type ClientStatus,
  type ClientSummaryResponse,
} from "@/features/clients"

// Page serveur bornée à 100 ; on charge par paquets au fil du scroll.
const PAGE_SIZE = 30

const STATUS_BADGE: Record<ClientStatus, string> = {
  ACTIVE: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]",
  ARCHIVED: "bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]",
}

interface ClientRowProps {
  client: ClientSummaryResponse
  canManage: boolean
  onOpen: (client: ClientSummaryResponse) => void
  onArchiveToggle: (client: ClientSummaryResponse) => void
  onDelete: (client: ClientSummaryResponse) => void
}

function ClientRow({
  client,
  canManage,
  onOpen,
  onArchiveToggle,
  onDelete,
}: ClientRowProps) {
  const { t } = useTranslation()
  const isArchived = client.status === "ARCHIVED"
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(client)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(client)
        }
      }}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="min-w-0 grow basis-48">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-neutral-900">
            {client.name}
          </p>
          <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
            {t(`clients.type.${client.type}`)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {client.reference}
          {client.email ? ` · ${client.email}` : ""}
          {client.phone ? ` · ${client.phone}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {client.deliveryBlocked && (
          <span className="rounded-full bg-[var(--status-failed-bg)] px-2 py-0.5 text-xs font-medium text-[var(--status-failed-text)]">
            {t("clients.deliveryBlocked")}
          </span>
        )}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_BADGE[client.status],
          )}
        >
          {t(`clients.status.${client.status}`)}
        </span>
      </div>

      {canManage && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onArchiveToggle(client)
            }}
          >
            {isArchived ? (
              <>
                <ArchiveRestore />
                {t("clients.restore")}
              </>
            ) : (
              <>
                <Archive />
                {t("clients.archive")}
              </>
            )}
          </Button>
          {isArchived && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(client)
              }}
              aria-label={t("clients.delete")}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ClientsList({ company }: { company: CompanyMembership }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const companyId = company.companyId
  const canManage = hasPermission(company, KNOWN_PERMISSIONS.MANAGE_CLIENTS)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ClientStatus>("ACTIVE")
  const [sort, setSort] = useState("name,asc")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const [toArchive, setToArchive] = useState<ClientSummaryResponse | null>(null)
  const [toDelete, setToDelete] = useState<ClientSummaryResponse | null>(null)

  const archiveClient = useArchiveClient(companyId)
  const restoreClient = useRestoreClient(companyId)
  const deleteClient = useDeleteClient(companyId)

  const clients = useInfiniteClients(companyId, {
    status,
    q: debouncedSearch || undefined,
    size: PAGE_SIZE,
    sort,
  })
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = clients

  const rows = clients.data?.pages.flatMap((p) => p.content) ?? []
  const totalElements = clients.data?.pages[0]?.totalElements ?? rows.length
  const hasRows = rows.length > 0

  // Virtualisation sur le scroll de la page : seules les lignes visibles sont
  // dans le DOM ; les données restent en mémoire (remonter = tout réapparaît).
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  // Dépend de `hasRows` : la liste n'est montée qu'une fois des clients chargés,
  // il faut donc (re)mesurer son offset à ce moment-là.
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    const measure = () => setScrollMargin(el.offsetTop)
    measure()
    // L'offset du haut de liste bouge si le contenu au-dessus change de hauteur.
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [hasRows])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 76,
    overscan: 6,
    gap: 8,
    scrollMargin,
  })
  const virtualItems = virtualizer.getVirtualItems()

  // Charge la page suivante quand on approche du bas de ce qui est chargé.
  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1]
    if (!last) return
    if (last.index >= rows.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [virtualItems, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  // Nouvelle recherche/filtre/tri → on revient en haut de la liste.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [debouncedSearch, status, sort])

  const confirmArchive = async () => {
    if (!toArchive) return
    try {
      await archiveClient.mutateAsync(toArchive.id)
      setToArchive(null)
    } catch {
      /* erreur affichée dans le dialog */
    }
  }

  const onArchiveToggle = (client: ClientSummaryResponse) => {
    if (client.status === "ARCHIVED") restoreClient.mutate(client.id)
    else setToArchive(client)
  }

  const onDelete = (client: ClientSummaryResponse) => {
    deleteClient.reset()
    setToDelete(client)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteClient.mutateAsync(toDelete.id)
      setToDelete(null)
    } catch {
      /* erreur affichée dans le dialog */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {t("clients.title")}
            </h1>
            {hasRows && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {totalElements}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("clients.description")}
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => navigate("/app/company/clients/new")}
            className="shrink-0"
          >
            <Plus />
            {t("clients.new")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-48">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("clients.searchPlaceholder")}
              className="pl-9"
              aria-label={t("clients.searchPlaceholder")}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientStatus)}
            aria-label={t("clients.filters.status")}
            className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="ACTIVE">{t("clients.status.ACTIVE")}</option>
            <option value="ARCHIVED">{t("clients.status.ARCHIVED")}</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label={t("clients.filters.sort")}
            className="h-9 shrink-0 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="name,asc">{t("clients.sort.nameAsc")}</option>
            <option value="name,desc">{t("clients.sort.nameDesc")}</option>
            <option value="createdAt,desc">{t("clients.sort.newest")}</option>
            <option value="createdAt,asc">{t("clients.sort.oldest")}</option>
          </select>
        </div>

        {clients.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(clients.error)}</AlertDescription>
          </Alert>
        )}

        {clients.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {!clients.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {debouncedSearch ? t("clients.noResults") : t("clients.empty")}
          </p>
        )}

        {rows.length > 0 && (
          <div
            ref={listRef}
            className="relative"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualItems.map((item) => {
              const client = rows[item.index]
              if (!client) return null
              return (
                <div
                  key={client.id}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                  }}
                >
                  <ClientRow
                    client={client}
                    canManage={canManage}
                    onOpen={(c) => navigate(`/app/company/clients/${c.id}`)}
                    onArchiveToggle={onArchiveToggle}
                    onDelete={onDelete}
                  />
                </div>
              )
            })}
          </div>
        )}

        {rows.length > 0 && (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            {isFetchingNextPage
              ? t("clients.pagination.loadingMore")
              : !hasNextPage
                ? t("clients.pagination.loaded", {
                    loaded: rows.length,
                    total: totalElements,
                  })
                : " "}
          </p>
        )}
        </CardContent>
      </Card>

      <Dialog
        open={toArchive !== null}
        onOpenChange={(open) => {
          if (!open && !archiveClient.isPending) setToArchive(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.archiveTitle")}</DialogTitle>
            <DialogDescription>
              {t("clients.archiveBody", { name: toArchive?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {archiveClient.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(archiveClient.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToArchive(null)}
              disabled={archiveClient.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button loading={archiveClient.isPending} onClick={confirmArchive}>
              {t("clients.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteClient.isPending) setToDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("clients.deleteBody", { name: toDelete?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {deleteClient.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(deleteClient.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleteClient.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              loading={deleteClient.isPending}
              onClick={confirmDelete}
            >
              {t("clients.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ClientsPage() {
  return (
    <CompanyShell showHeader={false}>
      {(company) => <ClientsList company={company} />}
    </CompanyShell>
  )
}
