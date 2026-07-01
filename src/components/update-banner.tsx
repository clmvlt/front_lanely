import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { config } from "@/lib/config"
import { APP_VERSION, fetchDeployedVersion } from "@/lib/version"

/** Intervalle de verification periodique de la version deployee. */
const POLL_INTERVAL_MS = 1 * 30 * 1000

/**
 * Detecte qu'une nouvelle version du frontend a ete deployee.
 * Verifie au montage, periodiquement, et chaque fois que l'onglet redevient
 * visible (cas frequent : l'utilisateur revient sur une session ouverte depuis
 * longtemps). Inactif en dev (pas de version.json servi, HMR s'en charge).
 */
function useUpdateAvailable(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (config.isDev || updateAvailable) return

    let cancelled = false
    const controller = new AbortController()

    const check = async () => {
      const deployed = await fetchDeployedVersion(controller.signal)
      if (!cancelled && deployed && deployed !== APP_VERSION) {
        setUpdateAvailable(true)
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") check()
    }

    check()
    const timer = window.setInterval(check, POLL_INTERVAL_MS)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [updateAvailable])

  return updateAvailable
}

export function UpdateBanner() {
  const { t } = useTranslation()
  const updateAvailable = useUpdateAvailable()

  const reload = useCallback(() => {
    window.location.reload()
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <RefreshCw className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t("update.title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("update.description")}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={reload} className="w-full sm:w-auto">
          {t("update.reload")}
        </Button>
      </div>
    </div>
  )
}
