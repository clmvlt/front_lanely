import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

export function FullPageSpinner() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">{t("common.loading")}</span>
      </div>
    </div>
  )
}
