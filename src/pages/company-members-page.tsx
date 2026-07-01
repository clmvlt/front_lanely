import { CompanyShell } from "@/components/company-shell"
import { CompanyMembersCard } from "@/components/company-members-card"
import { CompanyProfilesCard } from "@/components/company-profiles-card"
import { CompanyInvitationsCard } from "@/components/company-invitations-card"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"

export function CompanyMembersPage() {
  return (
    <CompanyShell>
      {(company) => (
        <>
          <CompanyMembersCard
            companyId={company.companyId}
            canManagePermissions={hasPermission(
              company,
              KNOWN_PERMISSIONS.MANAGE_PERMISSIONS,
            )}
          />

          <CompanyProfilesCard
            companyId={company.companyId}
            canManage={hasPermission(
              company,
              KNOWN_PERMISSIONS.MANAGE_PROFILES,
            )}
          />

          {company.role === "OWNER" && (
            <CompanyInvitationsCard
              companyId={company.companyId}
              canManage={hasPermission(
                company,
                KNOWN_PERMISSIONS.MANAGE_COMPANY,
              )}
            />
          )}
        </>
      )}
    </CompanyShell>
  )
}
