import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Permission } from "@/lib/permissions"
import { ApiError } from "@/lib/http"
import { authKeys } from "@/features/auth"
import { subscriptionKeys } from "@/features/subscriptions"
import { companiesApi } from "./companies.api"
import { companyKeys } from "./companies.keys"
import type { CreateCompanyInput, UpdateCompanyInput } from "./types"

export function useCompanyDetail(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: () => companiesApi.get(id),
    enabled: Boolean(id),
  })
}

export function useCompanyMe(id: string) {
  return useQuery({
    queryKey: companyKeys.me(id),
    queryFn: () => companiesApi.me(id),
    enabled: Boolean(id),
  })
}

export function useCompanyMembers(id: string) {
  return useQuery({
    queryKey: companyKeys.members(id),
    queryFn: () => companiesApi.members(id),
    enabled: Boolean(id),
  })
}

export function useCompanyCode(id: string) {
  return useQuery({
    queryKey: companyKeys.code(id),
    queryFn: () => companiesApi.code(id),
    enabled: Boolean(id),
  })
}

export function useCompanyByCode(publicCode: string) {
  return useQuery({
    queryKey: companyKeys.byCode(publicCode),
    queryFn: () => companiesApi.byCode(publicCode),
    enabled: Boolean(publicCode),
  })
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: companyKeys.permissionCatalog(),
    queryFn: companiesApi.permissionCatalog,
    staleTime: 60 * 60_000,
  })
}

export function useMemberPermissions(id: string, userId: string) {
  return useQuery({
    queryKey: companyKeys.memberPermissions(id, userId),
    queryFn: () => companiesApi.memberPermissions(id, userId),
    enabled: Boolean(id) && Boolean(userId),
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => companiesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me })
      // La création consomme un quota d'entreprise : la page Abonnement
      // (usage + liste des entreprises) doit refléter le nouvel état.
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine() })
    },
    onError: (error) => {
      // Abonnement insuffisant (état périmé côté front) : on resynchronise
      // `me` et l'abonnement pour refléter la réalité serveur.
      if (error instanceof ApiError && error.status === 403) {
        queryClient.invalidateQueries({ queryKey: authKeys.me })
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine() })
      }
    },
  })
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => companiesApi.update(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKeys.detail(id), data)
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useUpdateCompanyPicture(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => companiesApi.updatePicture(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useDeleteCompanyPicture(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => companiesApi.deletePicture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

export function useSetMemberPermissions(id: string, userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permissions: Permission[]) =>
      companiesApi.setMemberPermissions(id, userId, permissions),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKeys.memberPermissions(id, userId), data)
      queryClient.invalidateQueries({ queryKey: companyKeys.members(id) })
    },
  })
}
