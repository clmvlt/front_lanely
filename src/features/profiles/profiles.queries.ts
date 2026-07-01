import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/http"
import { authKeys } from "@/features/auth"
import { profilesApi } from "./profiles.api"
import { profileKeys } from "./profiles.keys"
import type { CreateProfileInput, UpdateProfileInput } from "./types"

export function useCompanyProfiles(companyId: string) {
  return useQuery({
    queryKey: profileKeys.company(companyId),
    queryFn: () => profilesApi.list(companyId),
    enabled: Boolean(companyId),
  })
}

export function useCreateProfile(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProfileInput) =>
      profilesApi.create(companyId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: profileKeys.company(companyId),
      }),
  })
}

export function useUpdateProfile(companyId: string, profileId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      profilesApi.update(companyId, profileId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: profileKeys.company(companyId),
      }),
  })
}

export function useDeleteProfile(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (profileId: string) => profilesApi.remove(companyId, profileId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: profileKeys.company(companyId),
      }),
    onError: (error) => {
      // 404 : déjà supprimé ailleurs → resynchroniser la liste.
      // 403 : permissions périmées → resynchroniser le profil (permissions).
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({
          queryKey: profileKeys.company(companyId),
        })
      } else if (error instanceof ApiError && error.status === 403) {
        queryClient.invalidateQueries({ queryKey: authKeys.me })
      }
    },
  })
}

export function useSetProfileActive(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ profileId, active }: { profileId: string; active: boolean }) =>
      active
        ? profilesApi.activate(companyId, profileId)
        : profilesApi.deactivate(companyId, profileId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: profileKeys.company(companyId),
      }),
  })
}
