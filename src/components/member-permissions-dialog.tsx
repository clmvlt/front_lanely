import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { getErrorMessage } from "@/lib/api-error"
import type { Permission } from "@/lib/permissions"
import {
  usePermissionCatalog,
  useSetMemberPermissions,
  type CompanyMember,
} from "@/features/companies"

interface MemberPermissionsDialogProps {
  companyId: string
  member: CompanyMember | null
  onOpenChange: (open: boolean) => void
}

export function MemberPermissionsDialog({
  companyId,
  member,
  onOpenChange,
}: MemberPermissionsDialogProps) {
  const { t } = useTranslation()
  const catalog = usePermissionCatalog()
  const setPermissions = useSetMemberPermissions(companyId, member?.userId ?? "")
  const [selected, setSelected] = useState<Permission[]>([])

  useEffect(() => {
    if (member) setSelected(member.permissions)
  }, [member])

  const toggle = (key: Permission, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...new Set([...prev, key])] : prev.filter((p) => p !== key),
    )

  const handleSave = async () => {
    try {
      await setPermissions.mutateAsync(selected)
      onOpenChange(false)
    } catch {
      /* erreur affichée via setPermissions.error */
    }
  }

  return (
    <Dialog open={member !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("company.members.editPermissions")}</DialogTitle>
          <DialogDescription>
            {member
              ? t("company.members.editPermissionsFor", {
                  name: `${member.firstName} ${member.lastName}`,
                })
              : ""}
          </DialogDescription>
        </DialogHeader>

        {setPermissions.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {getErrorMessage(setPermissions.error)}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3">
          {catalog.data?.map((permission) => (
            <Label
              key={permission.key}
              htmlFor={`perm-${permission.key}`}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <Checkbox
                id={`perm-${permission.key}`}
                checked={selected.includes(permission.key)}
                onCheckedChange={(checked) =>
                  toggle(permission.key, checked === true)
                }
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium text-neutral-900">
                  {permission.key}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {permission.description}
                </span>
              </span>
            </Label>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={setPermissions.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={setPermissions.isPending}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
