import type { CompanyRole } from "@/lib/permissions"
import type { UserAuthResponse } from "@/features/auth/types"

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"

export interface InvitationResponse {
  id: string
  email: string
  status: InvitationStatus
  expiresAt: string
  code: string | null
  joinLink: string | null
}

export interface CreateInvitationInput {
  email: string
}

export interface NewAccountInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface AcceptInvitationInput {
  code: string
  newAccount?: NewAccountInput
}

export interface AcceptInvitationResponse {
  companyId: string
  companyName: string
  role: CompanyRole
  auth: UserAuthResponse | null
}
