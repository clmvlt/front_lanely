import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { waybillKeys } from "@/features/waybills/waybills.keys"
import { toursApi } from "./tours.api"
import { tourKeys } from "./tours.keys"
import type {
  AssignTourRequest,
  ChangeTourStatusRequest,
  CreateTourRequest,
  ListToursParams,
  RoutePreviewRequest,
  SetTourWaybillsRequest,
  TourResponse,
  UpdateTourRequest,
} from "./types"

export function useInfiniteTours(
  companyId: string,
  params: Omit<ListToursParams, "page">,
) {
  return useInfiniteQuery({
    queryKey: tourKeys.infiniteList(companyId, params),
    queryFn: ({ pageParam }) =>
      toursApi.list(companyId, { ...params, page: pageParam }),
    enabled: Boolean(companyId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useTour(companyId: string, tourId: string) {
  return useQuery({
    queryKey: tourKeys.detail(companyId, tourId),
    queryFn: () => toursApi.get(companyId, tourId),
    enabled: Boolean(companyId) && Boolean(tourId),
  })
}

function useTourMutationDefaults(companyId: string) {
  const queryClient = useQueryClient()
  return (data: TourResponse) => {
    queryClient.setQueryData(tourKeys.detail(companyId, data.id), data)
    queryClient.invalidateQueries({ queryKey: tourKeys.lists(companyId) })
    // Rattacher/détacher des lettres ou changer le statut impacte les lettres.
    queryClient.invalidateQueries({ queryKey: waybillKeys.company(companyId) })
  }
}

export function useCreateTour(companyId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (input: CreateTourRequest) => toursApi.create(companyId, input),
    onSuccess: onTourSaved,
  })
}

export function useUpdateTour(companyId: string, tourId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (input: UpdateTourRequest) =>
      toursApi.update(companyId, tourId, input),
    onSuccess: onTourSaved,
  })
}

export function useAssignTour(companyId: string, tourId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (input: AssignTourRequest) =>
      toursApi.assign(companyId, tourId, input),
    onSuccess: onTourSaved,
  })
}

export function useSetTourWaybills(companyId: string, tourId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (input: SetTourWaybillsRequest) =>
      toursApi.setWaybills(companyId, tourId, input),
    onSuccess: onTourSaved,
  })
}

export function useOptimizeTour(companyId: string, tourId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: () => toursApi.optimize(companyId, tourId),
    onSuccess: (data) => onTourSaved(data.tour),
  })
}

/** Preview temps réel : ne persiste rien (cf. réordonnancement §7). */
export function useTourRoutePreview(companyId: string, tourId: string) {
  return useMutation({
    mutationFn: (input: RoutePreviewRequest) =>
      toursApi.routePreview(companyId, tourId, input),
  })
}

/** Enregistre l'ordre + le trajet (persiste). */
export function useSaveTourRoute(companyId: string, tourId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (input: RoutePreviewRequest) =>
      toursApi.saveRoute(companyId, tourId, input),
    onSuccess: onTourSaved,
  })
}

export function useChangeTourStatus(companyId: string, tourId: string) {
  const queryClient = useQueryClient()
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (input: ChangeTourStatusRequest) =>
      toursApi.changeStatus(companyId, tourId, input),
    onSuccess: (data) => {
      onTourSaved(data)
      queryClient.invalidateQueries({
        queryKey: tourKeys.statusHistory(companyId, tourId),
      })
    },
  })
}

/**
 * Historique de statut d'une tournée, paginé en scroll infini (le plus récent
 * en premier). `enabled` pour ne charger qu'à l'ouverture de la vue dédiée.
 */
export function useTourStatusHistory(
  companyId: string,
  tourId: string,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: tourKeys.statusHistory(companyId, tourId),
    queryFn: ({ pageParam }) =>
      toursApi.statusHistory(companyId, tourId, {
        page: pageParam,
        size: 20,
      }),
    enabled: Boolean(companyId) && Boolean(tourId) && enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useCancelTour(companyId: string) {
  const onTourSaved = useTourMutationDefaults(companyId)
  return useMutation({
    mutationFn: (tourId: string) => toursApi.cancel(companyId, tourId),
    onSuccess: onTourSaved,
  })
}
