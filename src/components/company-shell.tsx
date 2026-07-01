import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Building2, Lock, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { imageUrl } from "@/lib/images"
import { useCompany } from "@/app/company-context"
import { useCanCreateCompany } from "@/features/subscriptions"
import type { CompanyMembership } from "@/features/auth"

export function CompanyShell({
  children,
  showHeader = true,
}: {
  children: (company: CompanyMembership) => ReactNode
  /**
   * Affiche l'en-tête identité de l'entreprise (logo + nom + rôle/code).
   * À désactiver sur les pages qui ont leur propre titre (ex. Clients), où
   * répéter l'identité de l'entreprise active serait redondant.
   */
  showHeader?: boolean
}) {
  const { t } = useTranslation()
  const { selectedCompany } = useCompany()
  const { canCreate } = useCanCreateCompany()

  if (!selectedCompany) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            {canCreate ? (
              <Building2 className="size-5" />
            ) : (
              <Lock className="size-5" />
            )}
          </span>
          <p className="text-sm font-medium text-neutral-900">
            {t("dashboard.noCompanies")}
          </p>
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? t("dashboard.createFromMenu")
              : t("dashboard.subscriptionRequiredBody")}
          </p>
          <div className="flex items-start gap-2 rounded-md bg-accent/50 p-3 text-xs text-muted-foreground">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <span>{t("dashboard.joinHint")}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const logo = imageUrl(selectedCompany.profileImageUrl)

  return (
    <div className="flex flex-col gap-8">
      {showHeader && (
        <div className="flex items-center gap-4">
          {logo ? (
            <img src={logo} alt="" className="size-14 rounded-md object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-md bg-accent text-xl font-semibold text-accent-foreground">
              {selectedCompany.companyName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
              {selectedCompany.companyName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(`company.roles.${selectedCompany.role}`)} ·{" "}
              {t("company.settings.publicCode")}: {selectedCompany.publicCode}
            </p>
          </div>
        </div>
      )}

      {children(selectedCompany)}
    </div>
  )
}
