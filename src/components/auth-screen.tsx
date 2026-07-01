import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { BrandLogo } from "@/components/brand-logo"

interface AuthScreenProps {
  children: ReactNode
}

/**
 * Coquille commune des écrans d'authentification (login, register, join,
 * vérification…). Fond de page sobre (grille estompée + halo de marque),
 * logo Lanely centré au-dessus du contenu, sélecteur de langue accessible.
 */
export function AuthScreen({ children }: AuthScreenProps) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:36px_36px] opacity-50 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />
        <div className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-100 opacity-30 blur-3xl" />
      </div>

      <header className="relative flex items-center justify-between gap-3 p-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Link to="/">
            <ArrowLeft />
            <span className="hidden sm:inline">{t("common.backHome")}</span>
          </Link>
        </Button>
        <LanguageSwitcher />
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <div className="flex w-full max-w-sm flex-col items-center">
          <BrandLogo className="mb-6" />
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {year} Lanely
          </p>
        </div>
      </main>
    </div>
  )
}
