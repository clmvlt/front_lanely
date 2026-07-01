import { useRef, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  Building2,
  ChevronDown,
  CreditCard,
  LogOut,
  Plus,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AppSidebar } from "@/components/app-sidebar"
import { AppMobileNav } from "@/components/app-mobile-nav"
import { BrandLogo } from "@/components/brand-logo"
import { LanguageSwitcher } from "@/components/language-switcher"
import { CreateCompanyDialog } from "@/components/create-company-dialog"
import { EmailVerificationRequiredPage } from "@/pages/email-verification-required-page"
import { imageUrl } from "@/lib/images"
import { useLogout } from "@/features/auth"
import { useAuth } from "@/app/auth-context"
import { useCompany } from "@/app/company-context"

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function AppLayout() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { companies, selectedCompany, selectCompany } = useCompany()
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useLogout()

  // Écrans « pleine largeur » : les pages dédiées denses (listes, tableaux,
  // tableau de bord du quai, liste + carte) exploitent toute la surface plutôt
  // que la colonne centrée par défaut, pour ne jamais « faire vide » (règle
  // d'or n°9). Inclut la liste générale des lettres de voiture ET celle filtrée
  // par donneur d'ordre (même écran).
  const fullBleedPaths = new Set([
    "/app/company/clients",
    "/app/company/vehicles",
    "/app/company/waybills",
    "/app/company/pricing",
    "/app/company/dock",
    "/app/company/tours",
  ])
  const fullBleed =
    fullBleedPaths.has(location.pathname) ||
    /^\/app\/company\/clients\/[^/]+\/waybills$/.test(location.pathname)

  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenuOpen(true)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150)
  }

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
    } finally {
      navigate("/login", { replace: true })
    }
  }

  const avatar = imageUrl(user?.profileImageUrl)

  if (user && !user.emailVerified) {
    return <EmailVerificationRequiredPage />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b bg-card px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-1 sm:gap-3">
            <span className="hidden sm:inline-flex">
              <BrandLogo />
            </span>
            <span className="sm:hidden">
              <BrandLogo markOnly />
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {user && (
              <DropdownMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                modal={false}
              >
                <DropdownMenuTrigger
                  aria-label={t("profile.menu")}
                  onMouseEnter={openMenu}
                  onMouseLeave={scheduleClose}
                  className="hidden cursor-pointer items-center gap-2 rounded-full p-0.5 pr-2 outline-none transition-colors hover:bg-accent focus-visible:outline-none data-[state=open]:bg-accent sm:flex"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                      {initials(user.firstName, user.lastName)}
                    </span>
                  )}
                  <span className="hidden text-sm text-neutral-700 sm:inline">
                    {user.firstName} {user.lastName}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={0}
                  className="w-64"
                  onMouseEnter={openMenu}
                  onMouseLeave={scheduleClose}
                >
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate font-medium">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                    <User />
                    {t("profile.menu")}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/app/subscription")}
                  >
                    <CreditCard />
                    {t("subscription.nav")}
                  </DropdownMenuItem>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger chevron="left">
                      <Building2 />
                      {t("profile.companies")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      alignOffset={-4}
                      className="mr-1 min-w-56"
                    >
                      {companies.length > 0 && (
                        <>
                          <DropdownMenuRadioGroup
                            value={selectedCompany?.companyId}
                            onValueChange={selectCompany}
                          >
                            {companies.map((company) => (
                              <DropdownMenuRadioItem
                                key={company.companyId}
                                value={company.companyId}
                                onSelect={(event) => event.preventDefault()}
                              >
                                <span className="truncate">
                                  {company.companyName}
                                </span>
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                        <Plus />
                        {t("dashboard.createCompany")}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={logout.isPending}
                  >
                    <LogOut />
                    {t("auth.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <LanguageSwitcher className="hidden sm:block" />

            <AppMobileNav onCreateCompany={() => setCreateOpen(true)} />
          </div>
        </header>

        {user && (
          <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
        )}

        <main className="flex-1">
          <div
            className={
              fullBleed
                ? "w-full px-4 py-6 sm:px-6 sm:py-8"
                : "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10"
            }
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
