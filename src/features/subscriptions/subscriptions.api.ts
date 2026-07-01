import { http } from "@/lib/http"
import type {
  ChangePlanInput,
  ChangePlanResult,
  CompanySeatUsage,
  MySubscription,
  SubscriptionPlan,
} from "./types"

export const subscriptionsApi = {
  plans: () =>
    http.get<SubscriptionPlan[]>("/subscription-plans", { auth: false }),

  mine: () => http.get<MySubscription>("/me/subscription"),

  changePlan: (input: ChangePlanInput) =>
    http.put<ChangePlanResult>("/me/subscription", input),

  companySeats: (companyId: string) =>
    http.get<CompanySeatUsage>(`/companies/${companyId}/seats`),
}
