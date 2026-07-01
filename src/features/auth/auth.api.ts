import { http } from "@/lib/http"
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  GoogleAuthResponse,
  GoogleLoginInput,
  GoogleRegisterInput,
  LoginInput,
  MeResponse,
  RegisterInput,
  ResetPasswordInput,
  Session,
  UpdateMeInput,
  UserAuthResponse,
} from "./types"

function pictureForm(file: File): FormData {
  const form = new FormData()
  form.append("file", file)
  return form
}

export const authApi = {
  register: (input: RegisterInput) =>
    http.post<UserAuthResponse>("/auth/register", input, { auth: false }),

  login: (input: LoginInput, deviceLabel?: string) =>
    http.post<UserAuthResponse>("/auth/login", input, {
      auth: false,
      headers: deviceLabel ? { "X-Device-Label": deviceLabel } : undefined,
    }),

  googleLogin: (input: GoogleLoginInput, deviceLabel?: string) =>
    http.post<GoogleAuthResponse>("/auth/google", input, {
      auth: false,
      headers: deviceLabel ? { "X-Device-Label": deviceLabel } : undefined,
    }),

  googleRegister: (input: GoogleRegisterInput, deviceLabel?: string) =>
    http.post<UserAuthResponse>("/auth/google/register", input, {
      auth: false,
      headers: deviceLabel ? { "X-Device-Label": deviceLabel } : undefined,
    }),

  logout: () => http.post<void>("/auth/logout"),

  verifyEmail: (token: string) =>
    http.post<UserAuthResponse>("/auth/verify-email", { token }, {
      auth: false,
    }),

  resendVerification: () => http.post<void>("/auth/verify-email/resend"),

  forgotPassword: (input: ForgotPasswordInput) =>
    http.post<void>("/auth/forgot-password", input, { auth: false }),

  resetPassword: (input: ResetPasswordInput) =>
    http.post<void>("/auth/reset-password", input, { auth: false }),

  me: () => http.get<MeResponse>("/me"),

  updateMe: (input: UpdateMeInput) => http.patch<MeResponse>("/me", input),

  changePassword: (input: ChangePasswordInput) =>
    http.put<void>("/me/password", input),

  updatePicture: (file: File) =>
    http.put<MeResponse>("/me/picture", pictureForm(file)),

  deletePicture: () => http.delete<void>("/me/picture"),

  listSessions: () => http.get<Session[]>("/auth/sessions"),

  revokeSession: (sessionId: string) =>
    http.delete<void>(`/auth/sessions/${sessionId}`),

  revokeOtherSessions: () =>
    http.post<void>("/auth/sessions/revoke-others"),
}
