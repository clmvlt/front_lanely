import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Loader2, Monitor, Smartphone, Trash2 } from "lucide-react"
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
import { formatDateTime, formatRelative } from "@/lib/date"
import { getErrorMessage } from "@/lib/api-error"
import { clearTokens } from "@/lib/auth"
import {
  useRevokeOtherSessions,
  useRevokeSession,
  useSessions,
  type Session,
} from "@/features/auth"

function isMobile(userAgent: string | null): boolean {
  return userAgent ? /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) : false
}

/** Cible de confirmation : une session précise, ou « toutes les autres ». */
type RevokeTarget = { kind: "one"; session: Session } | { kind: "others" }

export function SessionsCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const sessions = useSessions()
  const revokeSession = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()

  const [target, setTarget] = useState<RevokeTarget | null>(null)

  const items = sessions.data ?? []
  const ordered = [...items].sort(
    (a, b) => Number(b.current) - Number(a.current),
  )
  const otherCount = items.filter((s) => !s.current).length

  const pending = revokeSession.isPending || revokeOthers.isPending
  const revokingCurrent =
    target?.kind === "one" && target.session.current

  const handleConfirm = async () => {
    if (!target) return
    try {
      if (target.kind === "others") {
        await revokeOthers.mutateAsync()
        setTarget(null)
        return
      }

      await revokeSession.mutateAsync(target.session.id)
      setTarget(null)

      if (target.session.current) {
        // On vient de révoquer la session courante : purge locale + retour login.
        clearTokens()
        queryClient.clear()
        navigate("/login", { replace: true })
      }
    } catch {
      /* erreur affichée via revokeSession.error / revokeOthers.error */
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid gap-1.5">
          <CardTitle className="text-base">
            {t("profile.sessions.title")}
          </CardTitle>
          <CardDescription>
            {t("profile.sessions.description")}
          </CardDescription>
        </div>
        {otherCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setTarget({ kind: "others" })}
            disabled={pending}
          >
            {t("profile.sessions.revokeOthers")}
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sessions.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {t("profile.sessions.loadError")}
            </AlertDescription>
          </Alert>
        )}

        {sessions.isLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : ordered.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t("profile.sessions.empty")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {ordered.map((session) => {
              const Icon = isMobile(session.userAgent) ? Smartphone : Monitor
              return (
                <li
                  key={session.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>

                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-neutral-900">
                        {session.deviceLabel ||
                          t("profile.sessions.unknownDevice")}
                      </span>
                      {session.current && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t("profile.sessions.current")}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {[session.ipAddress, formatRelative(session.lastUsedAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setTarget({ kind: "one", session })}
                    disabled={pending}
                    aria-label={t("profile.sessions.revoke")}
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={target !== null}
        onOpenChange={(open) => !open && !pending && setTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.kind === "others"
                ? t("profile.sessions.confirmOthersTitle")
                : t("profile.sessions.confirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {target?.kind === "others"
                ? t("profile.sessions.confirmOthersDescription")
                : t("profile.sessions.confirmDescription", {
                    device:
                      target?.kind === "one"
                        ? target.session.deviceLabel ||
                          t("profile.sessions.unknownDevice")
                        : "",
                  })}
            </DialogDescription>
          </DialogHeader>

          {revokingCurrent && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("profile.sessions.currentWarning")}
              </AlertDescription>
            </Alert>
          )}

          {target?.kind === "one" && (
            <p className="text-xs text-muted-foreground">
              {t("profile.sessions.signedIn", {
                when: formatDateTime(target.session.createdAt),
              })}
            </p>
          )}

          {(revokeSession.isError || revokeOthers.isError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(revokeSession.error ?? revokeOthers.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={pending}
            >
              {pending
                ? t("profile.sessions.revoking")
                : t("profile.sessions.revoke")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
