import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="text-5xl font-bold text-brand-500">404</p>
      <h1 className="text-xl font-semibold text-neutral-900">
        {t("notFound.title")}
      </h1>
      <Button asChild variant="outline">
        <Link to="/">{t("notFound.back")}</Link>
      </Button>
    </div>
  )
}
