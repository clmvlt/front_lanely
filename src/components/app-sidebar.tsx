import { useState } from "react"
import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { ParseKeys } from "i18next"
import {
  BadgeEuro,
  Contact,
  FileText,
  Route as RouteIcon,
  Settings,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { imageUrl } from "@/lib/images"
import { useCompany } from "@/app/company-context"

interface SidebarItem {
  to: string
  labelKey: ParseKeys
  icon: LucideIcon
}

/** Actions de gestion de l'entreprise - icône seule, à droite de l'en-tête. */
const COMPANY_ACTIONS: SidebarItem[] = [
  {
    to: "/app/company/settings",
    labelKey: "nav.companySettings",
    icon: Settings,
  },
  { to: "/app/company/members", labelKey: "nav.companyMembers", icon: Users },
]

/** Entrées de navigation listées sous l'en-tête. */
const NAV_ITEMS: SidebarItem[] = [
  { to: "/app/company/clients", labelKey: "nav.companyClients", icon: Contact },
  { to: "/app/company/vehicles", labelKey: "nav.companyVehicles", icon: Truck },
  {
    to: "/app/company/waybills",
    labelKey: "nav.companyWaybills",
    icon: FileText,
  },
  {
    to: "/app/company/pricing",
    labelKey: "nav.companyPricing",
    icon: BadgeEuro,
  },
  { to: "/app/company/dock", labelKey: "nav.companyDock", icon: Warehouse },
  { to: "/app/company/tours", labelKey: "nav.companyTours", icon: RouteIcon },
]

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { selectedCompany } = useCompany()
  const [expanded, setExpanded] = useState(false)

  if (!selectedCompany) return null

  const logo = imageUrl(selectedCompany.profileImageUrl)

  return (
    <aside className="hidden w-16 shrink-0 sm:block">
      <nav
        aria-label={t("nav.company")}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-brand-600 text-white shadow-lg transition-[width] duration-200 ease-out",
          expanded ? "w-64" : "w-16",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-3">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="size-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm font-semibold">
              {companyInitials(selectedCompany.companyName)}
            </span>
          )}

          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1 transition-opacity duration-200",
              expanded ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight">
                {selectedCompany.companyName}
              </span>
              <span className="block truncate text-xs leading-tight text-white/60">
                {selectedCompany.publicCode}
              </span>
            </span>

            {COMPANY_ACTIONS.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={t(labelKey)}
                aria-label={t(labelKey)}
                tabIndex={expanded ? 0 : -1}
                className={({ isActive }) =>
                  cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md outline-none transition-colors focus-visible:bg-white/10",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                <Icon className="size-5" />
              </NavLink>
            ))}
          </div>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-colors focus-visible:bg-white/10",
                    isActive
                      ? "bg-white/15 font-medium text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )
                }
              >
                <Icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    "truncate transition-opacity duration-200",
                    expanded ? "opacity-100" : "opacity-0",
                  )}
                >
                  {t(labelKey)}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
