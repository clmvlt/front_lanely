import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ShieldCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { MemberPermissionsDialog } from "@/components/member-permissions-dialog"
import { getErrorMessage } from "@/lib/api-error"
import { imageUrl } from "@/lib/images"
import { useCompanyMembers, type CompanyMember } from "@/features/companies"

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

interface CompanyMembersCardProps {
  companyId: string
  canManagePermissions: boolean
}

export function CompanyMembersCard({
  companyId,
  canManagePermissions,
}: CompanyMembersCardProps) {
  const { t } = useTranslation()
  const members = useCompanyMembers(companyId)
  const [editing, setEditing] = useState<CompanyMember | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("company.members.title")}</CardTitle>
        <CardDescription>{t("company.members.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {members.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(members.error)}
            </AlertDescription>
          </Alert>
        )}

        {members.isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}

        {members.data?.map((member) => {
          const isOwner = member.role === "OWNER"
          const avatar = imageUrl(member.profileImageUrl)
          return (
            <div
              key={member.userId}
              className="flex flex-wrap items-center gap-3 rounded-md border p-3"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                  {initials(member.firstName, member.lastName)}
                </span>
              )}
              <div className="min-w-0 grow basis-40">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {member.firstName} {member.lastName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                  {isOwner && <ShieldCheck className="size-3" />}
                  {t(`company.roles.${member.role}`)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isOwner
                    ? t("company.members.allPermissions")
                    : t("dashboard.permissions", {
                        count: member.permissions.length,
                      })}
                </span>
              </div>
              {canManagePermissions && !isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setEditing(member)}
                >
                  {t("company.members.editPermissions")}
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>

      <MemberPermissionsDialog
        companyId={companyId}
        member={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      />
    </Card>
  )
}
