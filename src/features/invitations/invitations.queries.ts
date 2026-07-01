import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { setTokens } from "@/lib/auth"
import { ApiError } from "@/lib/http"
import { authKeys } from "@/features/auth"
import { invitationsApi } from "./invitations.api"
import { invitationKeys } from "./invitations.keys"
import type { AcceptInvitationInput, CreateInvitationInput } from "./types"

export function useCompanyInvitations(companyId: string) {
  return useQuery({
    queryKey: invitationKeys.company(companyId),
    queryFn: () => invitationsApi.list(companyId),
    enabled: Boolean(companyId),
  })
}

export function useCreateInvitation(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      invitationsApi.create(companyId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: invitationKeys.company(companyId),
      }),
  })
}

export function useDeleteInvitation(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) =>
      invitationsApi.remove(companyId, invitationId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: invitationKeys.company(companyId),
      }),
    onError: (error) => {
      // 404 : déjà supprimée ailleurs → resynchroniser la liste.
      // 403 : permissions périmées → resynchroniser le profil (permissions).
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({
          queryKey: invitationKeys.company(companyId),
        })
      } else if (error instanceof ApiError && error.status === 403) {
        queryClient.invalidateQueries({ queryKey: authKeys.me })
      }
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AcceptInvitationInput) => invitationsApi.accept(input),
    onSuccess: (data) => {
      if (data.auth) setTokens(data.auth.tokens)
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}
