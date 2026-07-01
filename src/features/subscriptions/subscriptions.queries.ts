import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authKeys } from "@/features/auth"
import { subscriptionsApi } from "./subscriptions.api"
import { subscriptionKeys } from "./subscriptions.keys"
import type { ChangePlanInput } from "./types"

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: subscriptionsApi.plans,
    staleTime: 60 * 60_000,
  })
}

export function useMySubscription() {
  return useQuery({
    queryKey: subscriptionKeys.mine(),
    queryFn: subscriptionsApi.mine,
  })
}

/**
 * Capacité à créer une entreprise, dérivée de l'abonnement courant
 * (`/me/subscription`) : il reste un quota d'entreprises tant que
 * `companiesUsed < companiesLimit`. Sans plan, la limite vaut 0 → refus.
 */
export function useCanCreateCompany() {
  const query = useMySubscription()
  const subscription = query.data
  const canCreate = Boolean(
    subscription && subscription.companiesUsed < subscription.companiesLimit,
  )
  return {
    canCreate,
    isLoading: query.isLoading,
    subscription,
  }
}

export function useCompanySeats(companyId: string) {
  return useQuery({
    queryKey: subscriptionKeys.seats(companyId),
    queryFn: () => subscriptionsApi.companySeats(companyId),
    enabled: Boolean(companyId),
  })
}

export function useChangePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangePlanInput) => subscriptionsApi.changePlan(input),
    onSuccess: (data) => {
      queryClient.setQueryData(subscriptionKeys.mine(), data.subscription)
      // Les limites/quotas affichés ailleurs dépendent de l'abonnement courant.
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}
