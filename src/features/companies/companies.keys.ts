export const companyKeys = {
  all: ["companies"] as const,
  detail: (id: string) => [...companyKeys.all, id] as const,
  me: (id: string) => [...companyKeys.detail(id), "me"] as const,
  members: (id: string) => [...companyKeys.detail(id), "members"] as const,
  memberPermissions: (id: string, userId: string) =>
    [...companyKeys.members(id), userId, "permissions"] as const,
  code: (id: string) => [...companyKeys.detail(id), "code"] as const,
  byCode: (publicCode: string) =>
    [...companyKeys.all, "by-code", publicCode] as const,
  permissionCatalog: () => [...companyKeys.all, "permissions"] as const,
}
