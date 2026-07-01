import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { tourKeys } from "@/features/tours/tours.keys"
import { waybillsApi } from "./waybills.api"
import { waybillKeys } from "./waybills.keys"
import type {
  AssignWaybillRequest,
  BulkArchiveRequest,
  BulkCancelRequest,
  BulkStatusRequest,
  ChangeParcelStatusRequest,
  ChangeWaybillStatusRequest,
  CreateWaybillRequest,
  ListDockParams,
  ListWaybillsParams,
  SignatureDto,
  UpdateWaybillRequest,
} from "./types"

const HISTORY_PAGE_SIZE = 20

/**
 * Liste paginée en « scroll infini » : pages chargées à la demande et gardées
 * en mémoire. Tout changement de filtre/tri recrée la query (nouvelle clé) et
 * repart de la page 0.
 */
export function useInfiniteWaybills(
  companyId: string,
  params: Omit<ListWaybillsParams, "page">,
) {
  return useInfiniteQuery({
    queryKey: waybillKeys.infiniteList(companyId, params),
    queryFn: ({ pageParam }) =>
      waybillsApi.list(companyId, { ...params, page: pageParam }),
    enabled: Boolean(companyId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useWaybill(companyId: string, waybillId: string) {
  return useQuery({
    queryKey: waybillKeys.detail(companyId, waybillId),
    queryFn: () => waybillsApi.get(companyId, waybillId),
    enabled: Boolean(companyId) && Boolean(waybillId),
  })
}

export function useCreateWaybill(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWaybillRequest) =>
      waybillsApi.create(companyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: tourKeys.company(companyId) })
    },
  })
}

export function useUpdateWaybill(companyId: string, waybillId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateWaybillRequest) =>
      waybillsApi.update(companyId, waybillId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, waybillId), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
    },
  })
}

export function useChangeWaybillStatus(companyId: string, waybillId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangeWaybillStatusRequest) =>
      waybillsApi.changeStatus(companyId, waybillId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, waybillId), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
      queryClient.invalidateQueries({
        queryKey: waybillKeys.statusHistory(companyId, waybillId),
      })
    },
  })
}

export function useChangeParcelStatus(companyId: string, waybillId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      parcelId,
      input,
    }: {
      parcelId: string
      input: ChangeParcelStatusRequest
    }) => waybillsApi.changeParcelStatus(companyId, waybillId, parcelId, input),
    onSuccess: (data, { parcelId }) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, waybillId), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
      queryClient.invalidateQueries({
        queryKey: waybillKeys.parcelStatusHistory(
          companyId,
          waybillId,
          parcelId,
        ),
      })
    },
  })
}

/**
 * Historique de statut d'une lettre, paginé en scroll infini (le plus récent en
 * premier). `enabled` permet de ne charger qu'à l'ouverture de la vue dédiée.
 */
export function useWaybillStatusHistory(
  companyId: string,
  waybillId: string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: waybillKeys.statusHistory(companyId, waybillId),
    queryFn: ({ pageParam }) =>
      waybillsApi.statusHistory(companyId, waybillId, {
        page: pageParam,
        size: HISTORY_PAGE_SIZE,
      }),
    enabled: Boolean(companyId) && Boolean(waybillId) && enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useParcelStatusHistory(
  companyId: string,
  waybillId: string,
  parcelId: string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: waybillKeys.parcelStatusHistory(companyId, waybillId, parcelId),
    queryFn: ({ pageParam }) =>
      waybillsApi.parcelStatusHistory(companyId, waybillId, parcelId, {
        page: pageParam,
        size: HISTORY_PAGE_SIZE,
      }),
    enabled:
      Boolean(companyId) && Boolean(waybillId) && Boolean(parcelId) && enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useAddWaybillSignature(companyId: string, waybillId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SignatureDto) =>
      waybillsApi.addSignature(companyId, waybillId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, waybillId), data)
    },
  })
}

export function useAssignWaybill(companyId: string, waybillId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AssignWaybillRequest) =>
      waybillsApi.assign(companyId, waybillId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, waybillId), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: tourKeys.company(companyId) })
    },
  })
}

export function useCancelWaybill(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (waybillId: string) => waybillsApi.cancel(companyId, waybillId),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
      queryClient.invalidateQueries({ queryKey: tourKeys.company(companyId) })
    },
  })
}

export function useArchiveWaybill(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      waybillId,
      archived,
    }: {
      waybillId: string
      archived: boolean
    }) =>
      archived
        ? waybillsApi.archive(companyId, waybillId)
        : waybillsApi.unarchive(companyId, waybillId),
    onSuccess: (data) => {
      queryClient.setQueryData(waybillKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
    },
  })
}

/**
 * Actions groupées. La réponse `BulkResultResponse` décrit le résultat par item
 * (succès/échec localisé) ; on invalide systématiquement les listes et les
 * tournées après la requête.
 */
export function useBulkWaybillStatus(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkStatusRequest) =>
      waybillsApi.bulkStatus(companyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
      queryClient.invalidateQueries({ queryKey: tourKeys.company(companyId) })
    },
  })
}

export function useBulkArchiveWaybills(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkArchiveRequest) =>
      waybillsApi.bulkArchive(companyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
    },
  })
}

export function useBulkCancelWaybills(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BulkCancelRequest) =>
      waybillsApi.bulkCancel(companyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
      queryClient.invalidateQueries({ queryKey: waybillKeys.dock(companyId) })
      queryClient.invalidateQueries({ queryKey: tourKeys.company(companyId) })
    },
  })
}

// --- Quai (« à quai ») ---

/**
 * Liste paginée (scroll infini) de la marchandise actuellement à quai. Tout
 * changement de filtre recrée la query (nouvelle clé) et repart de la page 0.
 */
export function useInfiniteDock(
  companyId: string,
  params: Omit<ListDockParams, "page">,
) {
  return useInfiniteQuery({
    queryKey: waybillKeys.dockList(companyId, params),
    queryFn: ({ pageParam }) =>
      waybillsApi.dockList(companyId, { ...params, page: pageParam }),
    enabled: Boolean(companyId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

/** Totaux de la charge du quai (bandeau de la vue dédiée). */
export function useDockSummary(companyId: string) {
  return useQuery({
    queryKey: waybillKeys.dockSummary(companyId),
    queryFn: () => waybillsApi.dockSummary(companyId),
    enabled: Boolean(companyId),
  })
}
