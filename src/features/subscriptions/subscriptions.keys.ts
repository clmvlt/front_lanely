export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  plans: () => [...subscriptionKeys.all, "plans"] as const,
  mine: () => [...subscriptionKeys.all, "me"] as const,
  seats: (companyId: string) =>
    [...subscriptionKeys.all, "seats", companyId] as const,
}
