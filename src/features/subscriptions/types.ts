export interface SubscriptionPlan {
  code: string
  name: string
  description: string
  monthlyPriceCents: number
  monthlyPriceAmount: number
  currency: string
  taxIncluded: boolean
  maxCompanies: number
  maxSeatsPerCompany: number
  sortOrder: number
}

export interface CompanySeatUsage {
  companyId: string
  companyName: string
  activeProfiles: number
  members: number
  seatsUsed: number
  seatsLimit: number
  seatsRemaining: number
}

export interface MySubscription {
  plan: SubscriptionPlan | null
  companiesUsed: number
  companiesLimit: number
  companies: CompanySeatUsage[]
}

export interface ChangePlanInput {
  planCode: string
}

export interface ChangePlanResult {
  status: "ACTIVATED" | "PENDING_PAYMENT"
  subscription: MySubscription
  checkoutUrl: string | null
}
