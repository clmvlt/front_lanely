export const profileKeys = {
  all: ["profiles"] as const,
  company: (companyId: string) =>
    [...profileKeys.all, "company", companyId] as const,
}
