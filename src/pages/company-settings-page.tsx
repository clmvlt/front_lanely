import { CompanyShell } from "@/components/company-shell"
import { CompanySettingsCard } from "@/components/company-settings-card"
import { CompanyLegalBillingCard } from "@/components/company-legal-billing-card"
import { CompanyDepositCard } from "@/components/company-deposit-card"
import { CompanyGoodsTypesCard } from "@/components/company-goods-types-card"
import { hasPermission, KNOWN_PERMISSIONS } from "@/lib/permissions"

export function CompanySettingsPage() {
  return (
    <CompanyShell>
      {(company) => {
        const canManage = hasPermission(
          company,
          KNOWN_PERMISSIONS.MANAGE_COMPANY,
        )
        return (
          <div className="flex flex-col gap-6">
            <CompanySettingsCard company={company} canManage={canManage} />
            <CompanyDepositCard
              companyId={company.companyId}
              canManage={canManage}
            />
            <CompanyLegalBillingCard
              companyId={company.companyId}
              canManage={canManage}
            />
            <CompanyGoodsTypesCard company={company} />
          </div>
        )
      }}
    </CompanyShell>
  )
}
