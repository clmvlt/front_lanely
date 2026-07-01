import { useTranslation } from "react-i18next"
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"
import { ArrowRight, MapPin, User, Smartphone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api-error"
import { formatDateTime } from "@/lib/date"
import type {
  AccountType,
  PageResponse,
  StatusHistoryEntry,
} from "@/lib/transport-types"

type HistoryQuery = UseInfiniteQueryResult<
  InfiniteData<PageResponse<StatusHistoryEntry>>,
  Error
>

function ActorTypeBadge({ type }: { type: AccountType }) {
  const { t } = useTranslation()
  const Icon = type === "PROFILE" ? Smartphone : User
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-foreground">
      <Icon className="size-3" />
      {t(`transport.history.actorType.${type}`)}
    </span>
  )
}

function HistoryRow({
  entry,
  statusLabel,
}: {
  entry: StatusHistoryEntry
  statusLabel: (status: string) => string
}) {
  const { t } = useTranslation()
  const hasCoords = entry.latitude != null && entry.longitude != null
  return (
    <li className="flex flex-col gap-1.5 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {entry.fromStatus ? (
          <>
            <span className="text-muted-foreground">
              {statusLabel(entry.fromStatus)}
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium text-neutral-900">
              {statusLabel(entry.toStatus)}
            </span>
          </>
        ) : (
          <span className="font-medium text-neutral-900">
            {statusLabel(entry.toStatus)}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTime(entry.changedAt)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{entry.actor.name}</span>
        <ActorTypeBadge type={entry.actor.type} />
      </div>

      {entry.note && (
        <p className="text-sm text-neutral-900">{entry.note}</p>
      )}

      {hasCoords && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${entry.latitude},${entry.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-xs text-brand-800 hover:underline"
        >
          <MapPin className="size-3.5" />
          {t("transport.history.location", {
            lat: entry.latitude?.toFixed(5),
            lon: entry.longitude?.toFixed(5),
          })}
        </a>
      )}
    </li>
  )
}

/**
 * Vue d'historique de statut réutilisable (lettre / colis / tournée). Reçoit la
 * query infinie correspondante et une fonction de localisation des codes de
 * statut (les statuts arrivent en anglais).
 */
export function StatusHistoryDialog({
  open,
  onOpenChange,
  title,
  description,
  query,
  statusLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  query: HistoryQuery
  statusLabel: (status: string) => string
}) {
  const { t } = useTranslation()
  const entries = query.data?.pages.flatMap((page) => page.content) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? t("transport.history.description")}
          </DialogDescription>
        </DialogHeader>

        {query.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(query.error)}</AlertDescription>
          </Alert>
        )}

        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {query.isLoading ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : entries.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              {t("transport.history.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  statusLabel={statusLabel}
                />
              ))}
            </ul>
          )}

          {query.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-full"
              loading={query.isFetchingNextPage}
              onClick={() => query.fetchNextPage()}
            >
              {t("transport.history.loadMore")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
