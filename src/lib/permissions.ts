export type CompanyRole = "OWNER" | "MEMBER"

export type Permission = string

export const KNOWN_PERMISSIONS = {
  MANAGE_COMPANY: "MANAGE_COMPANY",
  MANAGE_PROFILES: "MANAGE_PROFILES",
  MANAGE_PERMISSIONS: "MANAGE_PERMISSIONS",
  MANAGE_CLIENTS: "MANAGE_CLIENTS",
  MANAGE_VEHICLES: "MANAGE_VEHICLES",
  MANAGE_TRANSPORTS: "MANAGE_TRANSPORTS",
  MANAGE_PRICING: "MANAGE_PRICING",
} as const

interface Membership {
  role: CompanyRole
  permissions: Permission[]
}

/** L'OWNER possède toutes les permissions ; un MEMBER seulement les siennes. */
export function hasPermission(
  membership: Membership | null | undefined,
  permission: Permission,
): boolean {
  if (!membership) return false
  if (membership.role === "OWNER") return true
  return membership.permissions.includes(permission)
}
