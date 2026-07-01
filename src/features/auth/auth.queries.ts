import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  clearTokens,
  getAccessToken,
  hasSession,
  setTokens,
} from "@/lib/auth"
import { ApiError, refreshSession } from "@/lib/http"
import { authApi } from "./auth.api"
import { authKeys } from "./auth.keys"
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  GoogleLoginInput,
  GoogleRegisterInput,
  LoginInput,
  MeResponse,
  RegisterInput,
  ResetPasswordInput,
  UpdateMeInput,
} from "./types"

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.me,
    enabled: options?.enabled ?? hasSession(),
    staleTime: 60_000,
    queryFn: async () => {
      if (!getAccessToken()) {
        const refreshed = await refreshSession()
        if (!refreshed) {
          clearTokens()
          throw new ApiError(401, "Session expired")
        }
      }
      return authApi.me()
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data) => {
      setTokens(data.tokens)
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: LoginInput; deviceLabel?: string }) =>
      authApi.login(vars.input, vars.deviceLabel),
    onSuccess: (data) => {
      setTokens(data.tokens)
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useGoogleLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: GoogleLoginInput; deviceLabel?: string }) =>
      authApi.googleLogin(vars.input, vars.deviceLabel),
    onSuccess: (data) => {
      // Compte existant : on ouvre la session. Sinon (REGISTRATION_REQUIRED),
      // la création doit d'abord être finalisée via useGoogleRegister.
      if (data.status === "AUTHENTICATED" && data.session) {
        setTokens(data.session.tokens)
        queryClient.invalidateQueries({ queryKey: authKeys.me })
      }
    },
  })
}

export function useGoogleRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: GoogleRegisterInput; deviceLabel?: string }) =>
      authApi.googleRegister(vars.input, vars.deviceLabel),
    onSuccess: (data) => {
      setTokens(data.tokens)
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: (data) => {
      setTokens(data.tokens)
      queryClient.setQueryData<MeResponse>(authKeys.me, (prev) =>
        prev?.user
          ? { ...prev, user: { ...prev.user, emailVerified: true } }
          : prev,
      )
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => authApi.resendVerification(),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => authApi.forgotPassword(input),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => authApi.resetPassword(input),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearTokens()
      queryClient.clear()
    },
  })
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateMeInput) => authApi.updateMe(input),
    onSuccess: (data) => queryClient.setQueryData(authKeys.me, data),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => authApi.changePassword(input),
  })
}

export function useUpdateProfilePicture() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => authApi.updatePicture(file),
    onSuccess: (data) => queryClient.setQueryData(authKeys.me, data),
  })
}

export function useDeleteProfilePicture() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.deletePicture(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  })
}

export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions,
    queryFn: authApi.listSessions,
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.sessions }),
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.sessions }),
  })
}
