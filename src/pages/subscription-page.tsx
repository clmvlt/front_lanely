import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Building2, Check, Loader2, Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-error"
import {
  useChangePlan,
  useMySubscription,
  useSubscriptionPlans,
  type SubscriptionPlan,
} from "@/features/subscriptions"

export function SubscriptionPage() {
  const { t, i18n } = useTranslation()
  const plansQuery = useSubscriptionPlans()
  const subscriptionQuery = useMySubscription()
  const changePlan = useChangePlan()

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

  const locale = i18n.resolvedLanguage ?? i18n.language

  const formatPrice = (plan: SubscriptionPlan) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: plan.currency,
    }).format(plan.monthlyPriceAmount)

  const plans = [...(plansQuery.data ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const subscription = subscriptionQuery.data
  const currentCode = subscription?.plan?.code ?? null

  const openConfirm = (plan: SubscriptionPlan) => {
    changePlan.reset()
    setSelectedPlan(plan)
  }

  const closeConfirm = () => {
    if (changePlan.isPending) return
    setSelectedPlan(null)
  }

  const handleConfirm = async () => {
    if (!selectedPlan) return
    try {
      const result = await changePlan.mutateAsync({
        planCode: selectedPlan.code,
      })
      // Paiement externe (Stripe à venir) : on quitte l'app vers le checkout.
      if (result.status === "PENDING_PAYMENT" && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }
      setSelectedPlan(null)
    } catch {
      /* erreur affichée via changePlan.error (message déjà localisé) */
    }
  }

  if (plansQuery.isLoading || subscriptionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {t("subscription.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subscription.subtitle")}
        </p>
      </div>

      {plansQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {getErrorMessage(plansQuery.error) ?? t("subscription.loadError")}
          </AlertDescription>
        </Alert>
      )}

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("subscription.usage.title")}
            </CardTitle>
            <CardDescription>
              {subscription.plan
                ? t("subscription.usage.description")
                : t("subscription.usage.none")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span>
                {t("subscription.usage.companies", {
                  count: subscription.companiesLimit,
                  used: subscription.companiesUsed,
                  limit: subscription.companiesLimit,
                })}
              </span>
            </div>

            {subscription.companies.length > 0 && (
              <ul className="flex flex-col gap-2">
                {subscription.companies.map((company) => (
                  <li
                    key={company.companyId}
                    className="flex flex-col gap-1 rounded-md border bg-accent/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-neutral-900">
                      {company.companyName}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 shrink-0" />
                        {t("subscription.usage.seats", {
                          used: company.seatsUsed,
                          limit: company.seatsLimit,
                          remaining: company.seatsRemaining,
                        })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentCode
          return (
            <Card
              key={plan.code}
              className={cn(
                "relative",
                isCurrent && "border-primary ring-1 ring-primary",
              )}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  <Check className="size-3" />
                  {t("subscription.currentPlan")}
                </span>
              )}
              <CardHeader>
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-neutral-900">
                    {formatPrice(plan)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {plan.taxIncluded
                      ? t("subscription.taxIncluded")
                      : t("subscription.taxExcluded")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("subscription.perMonth")}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="flex flex-col gap-2 text-sm text-neutral-700">
                  <li className="flex items-center gap-2">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" />
                    {t("subscription.limits.companies", {
                      count: plan.maxCompanies,
                    })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-muted-foreground" />
                    {t("subscription.limits.seats", {
                      count: plan.maxSeatsPerCompany,
                    })}
                  </li>
                </ul>

                <Button
                  className="mt-auto w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                  onClick={() => openConfirm(plan)}
                >
                  {isCurrent
                    ? t("subscription.currentPlan")
                    : t("subscription.choosePlan")}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog
        open={selectedPlan !== null}
        onOpenChange={(open) => (open ? undefined : closeConfirm())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("subscription.confirm.title", { plan: selectedPlan?.name })}
            </DialogTitle>
            <DialogDescription>
              {t("subscription.confirm.body", { plan: selectedPlan?.name })}
            </DialogDescription>
          </DialogHeader>

          {changePlan.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {getErrorMessage(changePlan.error)}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeConfirm}
              disabled={changePlan.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button loading={changePlan.isPending} onClick={handleConfirm}>
              {t("subscription.confirm.action")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
