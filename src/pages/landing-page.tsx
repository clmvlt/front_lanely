import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowRight,
  Building2,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/brand-logo"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useAuth } from "@/app/auth-context"

const FEATURES = [
  { key: "tracking", icon: MapPin },
  { key: "deliveries", icon: PackageCheck },
  { key: "teams", icon: Building2 },
] as const

export function LandingPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const year = new Date().getFullYear()

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:40px_40px] opacity-50 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_60%,transparent_100%)]" />
        <div className="absolute -top-48 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-brand-100 opacity-30 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-6 py-4">
        <BrandLogo />
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link to="/app">{t("landing.goToApp")}</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/login">{t("landing.signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">{t("landing.getStarted")}</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <Truck className="size-3.5 text-primary" />
          {t("landing.eyebrow")}
        </span>

        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
          {t("landing.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          {t("landing.subtitle")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Button asChild size="lg">
              <Link to="/app">
                {t("landing.goToApp")}
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/register">
                  {t("landing.getStarted")}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">{t("landing.signIn")}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card/60 p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                {t(`landing.features.${key}.title`)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(`landing.features.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t px-6 py-5 text-center text-xs text-muted-foreground">
        © {year} Lanely
      </footer>
    </div>
  )
}
