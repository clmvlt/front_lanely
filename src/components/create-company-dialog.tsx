import { useState } from "react"
import type * as React from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Loader2, Lock, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-error"
import { useCompany } from "@/app/company-context"
import { useCreateCompany } from "@/features/companies"
import { useCanCreateCompany } from "@/features/subscriptions"

interface CreateCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCompanyDialog({
  open,
  onOpenChange,
}: CreateCompanyDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectCompany } = useCompany()
  const createCompany = useCreateCompany()
  const [name, setName] = useState("")

  const { canCreate, isLoading } = useCanCreateCompany()

  const close = () => {
    setName("")
    createCompany.reset()
    onOpenChange(false)
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    try {
      const company = await createCompany.mutateAsync({ name: name.trim() })
      selectCompany(company.id)
      close()
    } catch {
      /* erreur affichée via createCompany.error (le 403 resync /me) */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : canCreate ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("dashboard.createCompany")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.createCompanySubtitle")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-3">
              {createCompany.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {getErrorMessage(createCompany.error)}
                  </AlertDescription>
                </Alert>
              )}
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("dashboard.companyName")}
                aria-label={t("dashboard.companyName")}
                autoFocus
              />
              <Button
                type="submit"
                disabled={createCompany.isPending || !name.trim()}
              >
                {t("dashboard.create")}
              </Button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="size-4 text-muted-foreground" />
                {t("dashboard.subscriptionRequiredTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("dashboard.subscriptionRequiredBody")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-start gap-2 rounded-md bg-accent/50 p-3 text-xs text-muted-foreground">
              <Mail className="mt-0.5 size-4 shrink-0" />
              <span>{t("dashboard.joinHint")}</span>
            </div>
            <Button
              type="button"
              onClick={() => {
                close()
                navigate("/app/subscription")
              }}
            >
              {t("dashboard.upgrade")}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
