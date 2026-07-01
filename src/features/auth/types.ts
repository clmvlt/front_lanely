import type { TokenResponse } from "@/lib/auth"
import type { CompanyRole, Permission } from "@/lib/permissions"
import type { Subscription } from "@/lib/subscription"

export type { TokenResponse }

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  emailVerified: boolean
  profileImageUrl: string | null
  subscription: Subscription
}

export interface UserAuthResponse {
  tokens: TokenResponse
  user: AuthUser
}

export interface CompanyMembership {
  companyId: string
  companyName: string
  publicCode: string
  profileImageUrl: string | null
  role: CompanyRole
  permissions: Permission[]
}

export interface MeUser extends AuthUser {
  companies: CompanyMembership[]
}

export interface ProfileSummary {
  id: string
  username: string
  displayName: string | null
  active: boolean
  companyId: string
  companyName: string
}

export interface MeResponse {
  type: "USER" | "PROFILE"
  user: MeUser | null
  profile: ProfileSummary | null
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface GoogleLoginInput {
  /** ID token (JWT) renvoyé par Google Identity Services (`response.credential`). */
  idToken: string
}

/** Identité pré-remplie (relue par le serveur depuis l'ID token Google). */
export interface GoogleRegistration {
  email: string
  firstName: string
  lastName: string
}

/**
 * Réponse de `POST /auth/google`, discriminée par `status` :
 * - `AUTHENTICATED` → `session` renseigné (compte existant) ;
 * - `REGISTRATION_REQUIRED` → `registration` renseigné (création à finaliser).
 */
export interface GoogleAuthResponse {
  status: "AUTHENTICATED" | "REGISTRATION_REQUIRED"
  session: UserAuthResponse | null
  registration: GoogleRegistration | null
}

export interface GoogleRegisterInput {
  /** Le MÊME ID token que celui de l'étape 1 (`/auth/google`). */
  idToken: string
  firstName: string
  lastName: string
}

export interface UpdateMeInput {
  firstName?: string
  lastName?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export interface Session {
  id: string
  deviceLabel: string | null
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
}
