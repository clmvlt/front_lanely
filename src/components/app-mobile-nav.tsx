import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ParseKeys } from "i18next"
import {
  BadgeEuro,
  Check,
  Contact,
  CreditCard,
  FileText,
  Globe,
  LogOut,
  Menu,
  Plus,
  Route as RouteIcon,
  Settings,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { imageUrl } from "@/lib/images"
import { supportedLanguages } from "@/i18n"
import { useLogout } from "@/features/auth"
import { useAuth } from "@/app/auth-context"
import { useCompany } from "@/app/company-context"

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
}

interface NavItem {
  to: string
  labelKey: ParseKeys
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app/company/settings", labelKey: "nav.companySettings", icon: Settings },
  { to: "/app/company/members", labelKey: "nav.companyMembers", icon: Users },
  { to: "/app/company/clients", labelKey: "nav.companyClients", icon: Contact },
  { to: "/app/company/vehicles", labelKey: "nav.companyVehicles", icon: Truck },
  { to: "/app/company/waybills", labelKey: "nav.companyWaybills", icon: FileText },
  { to: "/app/company/pricing", labelKey: "nav.companyPricing", icon: BadgeEuro },
  { to: "/app/company/dock", labelKey: "nav.companyDock", icon: Warehouse },
  { to: "/app/company/tours", labelKey: "nav.companyTours", icon: RouteIcon },
]

function userInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}

interface AppMobileNavProps {
  onCreateCompany: () => void
}

export function AppMobileNav({ onCreateCompany }: AppMobileNavProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { companies, selectedCompany, selectCompany } = useCompany()
  const navigate = useNavigate()
  const logout = useLogout()
  const [open, setOpen] = useState(false)

  const currentLang = i18n.resolvedLanguage ?? i18n.language

  if (!user) return null

  const userAvatar = imageUrl(user.profileImageUrl)
  const companyLogo = imageUrl(selectedCompany?.profileImageUrl)

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const handleLogout = async () => {
    setOpen(false)
    try {
      await logout.mutateAsync()
    } finally {
      navigate("/login", { replace: true })
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors focus-visible:bg-accent",
      isActive
        ? "bg-accent font-medium text-accent-foreground"
        : "text-foreground hover:bg-accent"
    )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("nav.menu")}
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-neutral-700 outline-none transition-colors hover:bg-accent focus-visible:outline-none data-[state=open]:bg-accent sm:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>

      <SheetContent side="right" showCloseButton={false} className="w-80 p-0">
        <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
        <SheetDescription className="sr-only">
          {t("nav.company")}
        </SheetDescription>

        {selectedCompany ? (
          <div className="flex items-center gap-3 bg-brand-600 px-4 py-4 text-white">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt=""
                className="size-11 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold">
                {companyInitials(selectedCompany.companyName)}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold leading-tight">
                {selectedCompany.companyName}
              </span>
              <span className="truncate text-xs leading-tight text-white/60">
                {selectedCompany.publicCode}
              </span>
            </span>
          </div>
        ) : (
          <div className="bg-brand-600 px-4 py-5 text-white">
            <span className="text-sm font-semibold">{t("nav.company")}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1 p-2">
          {selectedCompany &&
            NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={navLinkClass}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{t(labelKey)}</span>
              </NavLink>
            ))}
        </nav>

        <div className="border-t p-2">
          <div className="space-y-0.5">
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {t("profile.companies")}
            </p>
            {companies.map((company) => {
              const active = company.companyId === selectedCompany?.companyId
              return (
                <button
                  key={company.companyId}
                  type="button"
                  onClick={() => selectCompany(company.companyId)}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors focus-visible:bg-accent hover:bg-accent",
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="truncate text-left">{company.companyName}</span>
                  {active && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCreateCompany()
              }}
              className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground outline-none transition-colors focus-visible:bg-accent hover:bg-accent"
            >
              <Plus className="size-4 shrink-0" />
              {t("dashboard.createCompany")}
            </button>
          </div>
        </div>

        <div className="border-t p-2">
          <button
            type="button"
            onClick={() => go("/app/profile")}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground outline-none transition-colors focus-visible:bg-accent hover:bg-accent"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt=""
                className="size-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                {userInitials(user.firstName, user.lastName)}
              </span>
            )}
            <span className="flex min-w-0 flex-col text-left">
              <span className="truncate font-medium leading-tight">
                {user.firstName} {user.lastName}
              </span>
              <span className="truncate text-xs leading-tight text-muted-foreground">
                {t("profile.menu")}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => go("/app/subscription")}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground outline-none transition-colors focus-visible:bg-accent hover:bg-accent"
          >
            <CreditCard className="size-5 shrink-0" />
            {t("subscription.nav")}
          </button>
        </div>

        <div className="border-t p-2">
          <p className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Globe className="size-3.5" />
            {t("language.label")}
          </p>
          <div className="flex gap-2 px-1">
            {supportedLanguages.map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => i18n.changeLanguage(lng)}
                className={cn(
                  "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border text-sm outline-none transition-colors focus-visible:bg-accent",
                  currentLang === lng
                    ? "border-primary bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <span className="text-xs font-semibold uppercase">{lng}</span>
                {LANGUAGE_LABELS[lng] ?? lng}
                {currentLang === lng && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t p-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground outline-none transition-colors focus-visible:bg-accent hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <LogOut className="size-5 shrink-0" />
            {t("auth.logout")}
          </button>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
