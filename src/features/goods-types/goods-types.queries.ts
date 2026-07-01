import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ApiError } from "@/lib/http"
import { authKeys } from "@/features/auth"
import { goodsTypesApi } from "./goods-types.api"
import { goodsTypeKeys } from "./goods-types.keys"
import type {
  CreateGoodsTypeRequest,
  ListGoodsTypesParams,
  UpdateGoodsTypeRequest,
} from "./types"

/**
 * Liste paginée (scroll infini) du catalogue, pour l'écran de gestion. Tout
 * changement de `q`/`sort` recrée la query et repart de la page 0.
 */
export function useInfiniteGoodsTypes(
  companyId: string,
  params: Omit<ListGoodsTypesParams, "page">,
) {
  return useInfiniteQuery({
    queryKey: goodsTypeKeys.infiniteList(companyId, params),
    queryFn: ({ pageParam }) =>
      goodsTypesApi.list(companyId, { ...params, page: pageParam }),
    enabled: Boolean(companyId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

/**
 * Recherche d'auto-complétion (premiers résultats triés par nom). `enabled`
 * permet de ne déclencher la requête qu'à l'ouverture de la liste de
 * suggestions ; penser à débouncer `q` côté appelant.
 */
export function useGoodsTypeSearch(
  companyId: string,
  q: string,
  enabled = true,
) {
  return useQuery({
    queryKey: goodsTypeKeys.search(companyId, q),
    queryFn: () =>
      goodsTypesApi.list(companyId, { q: q || undefined, size: 8, sort: "name,asc" }),
    enabled: Boolean(companyId) && enabled,
  })
}

export function useCreateGoodsType(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGoodsTypeRequest) =>
      goodsTypesApi.create(companyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(goodsTypeKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: goodsTypeKeys.lists(companyId) })
    },
  })
}

export function useUpdateGoodsType(companyId: string, goodsTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateGoodsTypeRequest) =>
      goodsTypesApi.update(companyId, goodsTypeId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(goodsTypeKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: goodsTypeKeys.lists(companyId) })
    },
  })
}

export function useDeleteGoodsType(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (goodsTypeId: string) =>
      goodsTypesApi.remove(companyId, goodsTypeId),
    onSuccess: (_data, goodsTypeId) => {
      queryClient.removeQueries({
        queryKey: goodsTypeKeys.detail(companyId, goodsTypeId),
      })
      queryClient.invalidateQueries({ queryKey: goodsTypeKeys.lists(companyId) })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({ queryKey: goodsTypeKeys.lists(companyId) })
      } else if (error instanceof ApiError && error.status === 403) {
        queryClient.invalidateQueries({ queryKey: authKeys.me })
      }
    },
  })
}
