import type { CompanyRole, Permission } from "@/lib/permissions"

export type { CompanyRole, Permission }

export interface CompanyLegalInfo {
  legalName: string | null
  registrationNumber: string | null
  vatNumber: string | null
  legalForm: string | null
}

export interface CompanyBillingAddress {
  line1: string | null
  line2: string | null
  postalCode: string | null
  city: string | null
  state: string | null
  /** Code pays ISO 3166-1 alpha-2, renvoyé en majuscules (défaut "FR"). */
  country: string | null
}

/** Adresse postale du dépôt (entrepôt), même forme que l'adresse de facturation. */
export interface CompanyAddress {
  line1: string | null
  line2: string | null
  postalCode: string | null
  city: string | null
  state: string | null
  /** Code pays ISO 3166-1 alpha-2 (défaut "FR"). */
  country: string | null
}

/**
 * Coordonnées GPS du dépôt. Saisies MANUELLEMENT par le client : l'API ne les
 * calcule jamais depuis l'adresse. `latitude` ET `longitude` ensemble, ou `null`.
 */
export interface CompanyCoordinate {
  /** [-90, 90]. */
  latitude: number
  /** [-180, 180]. */
  longitude: number
}

/**
 * Adresse du dépôt (entrepôt), distincte de l'adresse de facturation. Les deux
 * sous-objets sont optionnels et indépendants (chacun peut être `null`).
 */
export interface CompanyDepositAddress {
  address: CompanyAddress | null
  coordinate: CompanyCoordinate | null
}

export interface CompanyResponse {
  id: string
  name: string
  publicCode: string
  callerRole: CompanyRole
  profileImageUrl: string | null
  legalInfo: CompanyLegalInfo | null
  billingAddress: CompanyBillingAddress | null
  billingEmail: string | null
  billingPhone: string | null
  /** Adresse du dépôt (entrepôt) ; `null` si jamais renseignée. */
  depositAddress: CompanyDepositAddress | null
}

export interface CompanyByCode {
  id: string
  name: string
  publicCode: string
  profileImageUrl: string | null
}

export interface CompanyCode {
  companyId: string
  publicCode: string
}

export interface CompanyMe {
  companyId: string
  role: CompanyRole
  permissions: Permission[]
}

export interface CompanyMember {
  userId: string
  email: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  role: CompanyRole
  permissions: Permission[]
}

export interface PermissionInfo {
  key: Permission
  description: string
}

export interface MemberPermissions {
  userId: string
  role: CompanyRole
  permissions: Permission[]
}

export interface CreateCompanyInput {
  name: string
  legalInfo?: CompanyLegalInfo | null
  billingAddress?: CompanyBillingAddress | null
  billingEmail?: string | null
  billingPhone?: string | null
  depositAddress?: CompanyDepositAddress | null
}

/**
 * PATCH /companies/{id} a une sémantique de REMPLACEMENT complet : tout champ
 * légal/facturation absent ou `null` est effacé côté serveur. Toujours repartir
 * de l'état courant (cf. `toUpdateCompanyInput`) avant de modifier.
 */
export interface UpdateCompanyInput {
  name: string
  legalInfo?: CompanyLegalInfo | null
  billingAddress?: CompanyBillingAddress | null
  billingEmail?: string | null
  billingPhone?: string | null
  /** Remplacement complet : `null` efface l'adresse du dépôt et ses coordonnées. */
  depositAddress?: CompanyDepositAddress | null
}

/** Construit le payload de remplacement complet à partir de l'état courant. */
export function toUpdateCompanyInput(
  company: CompanyResponse,
): UpdateCompanyInput {
  return {
    name: company.name,
    legalInfo: company.legalInfo,
    billingAddress: company.billingAddress,
    billingEmail: company.billingEmail,
    billingPhone: company.billingPhone,
    depositAddress: company.depositAddress,
  }
}
