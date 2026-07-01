export type ClientType = "COMPANY" | "INDIVIDUAL"
export type ClientStatus = "ACTIVE" | "ARCHIVED"
export type AddressType =
  | "HEADQUARTERS"
  | "DEPOT"
  | "BILLING"
  | "SHIPPING"
  | "OTHER"

export const CLIENT_TYPES: ClientType[] = ["COMPANY", "INDIVIDUAL"]
export const ADDRESS_TYPES: AddressType[] = [
  "HEADQUARTERS",
  "DEPOT",
  "BILLING",
  "SHIPPING",
  "OTHER",
]

export interface ClientLegalInfo {
  legalName: string | null
  registrationNumber: string | null
  vatNumber: string | null
  legalForm: string | null
}

export interface ClientSettings {
  preferredLanguage: "en" | "fr"
  autoSendInvoiceEmail: boolean
  autoSendDeliveryNotifications: boolean
  autoSendPaymentReminders: boolean
  billingEmail: string | null
}

export interface PostalAddress {
  line1: string | null
  line2: string | null
  postalCode: string | null
  city: string | null
  state: string | null
  /** Code pays ISO 3166-1 alpha-2 (défaut = pays de la société). */
  country: string | null
}

export interface ClientAddressResponse {
  id: string
  label: string | null
  type: AddressType
  address: PostalAddress
  latitude: number | null
  longitude: number | null
  isPrimary: boolean
  isDefaultBilling: boolean
  isDefaultShipping: boolean
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  deliveryInstructions: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientContactResponse {
  id: string
  firstName: string | null
  lastName: string | null
  jobTitle: string | null
  email: string | null
  phone: string | null
  isPrimary: boolean
  receivesInvoices: boolean
  receivesDeliveryNotifications: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientResponse {
  id: string
  reference: string
  type: ClientType
  name: string
  legalInfo: ClientLegalInfo | null
  email: string | null
  phone: string | null
  website: string | null
  paymentTermsDays: number
  status: ClientStatus
  deliveryBlocked: boolean
  accountManagerUserId: string | null
  notes: string | null
  settings: ClientSettings
  addresses: ClientAddressResponse[]
  contacts: ClientContactResponse[]
  createdAt: string
  updatedAt: string
}

export interface ClientSummaryResponse {
  id: string
  reference: string
  type: ClientType
  name: string
  email: string | null
  phone: string | null
  status: ClientStatus
  deliveryBlocked: boolean
  createdAt: string
}

/**
 * Enveloppe paginée renvoyée par l'API clients (forme dédiée : `page` est l'index
 * 0-based de la page, distincte du `number` de Spring Data brut).
 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ListClientsParams {
  status?: ClientStatus
  q?: string
  page?: number
  size?: number
  /** Ex. "name,asc" ou "createdAt,desc". */
  sort?: string
}

export interface CreateClientInput {
  reference?: string | null
  type: ClientType
  name: string
  legalInfo?: ClientLegalInfo | null
  email?: string | null
  phone?: string | null
  website?: string | null
  paymentTermsDays?: number | null
  accountManagerUserId?: string | null
  notes?: string | null
  settings?: Partial<ClientSettings> | null
}

/** PATCH : tous les champs nullables, seuls les non-null sont appliqués. */
export interface UpdateClientInput {
  reference?: string | null
  type?: ClientType | null
  name?: string | null
  legalInfo?: ClientLegalInfo | null
  email?: string | null
  phone?: string | null
  website?: string | null
  paymentTermsDays?: number | null
  deliveryBlocked?: boolean | null
  accountManagerUserId?: string | null
  notes?: string | null
  settings?: Partial<ClientSettings> | null
}

export interface CreateClientAddressInput {
  label?: string | null
  type?: AddressType | null
  address?: PostalAddress | null
  latitude?: number | null
  longitude?: number | null
  isPrimary?: boolean | null
  isDefaultBilling?: boolean | null
  isDefaultShipping?: boolean | null
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  deliveryInstructions?: string | null
}

export interface UpdateClientAddressInput extends CreateClientAddressInput {
  active?: boolean | null
}

export interface CreateClientContactInput {
  firstName?: string | null
  lastName?: string | null
  jobTitle?: string | null
  email?: string | null
  phone?: string | null
  isPrimary?: boolean | null
  receivesInvoices?: boolean | null
  receivesDeliveryNotifications?: boolean | null
}

export interface UpdateClientContactInput extends CreateClientContactInput {
  active?: boolean | null
}
