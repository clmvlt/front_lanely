import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ApiError } from "@/lib/http"
import { authKeys } from "@/features/auth"
import { vehiclesApi } from "./vehicles.api"
import { vehicleKeys } from "./vehicles.keys"
import type {
  CreateMileageReadingInput,
  CreateVehicleInput,
  DocumentCategory,
  ListVehiclesParams,
  UpdateVehicleInput,
  UploadDocumentInput,
} from "./types"

// --- Véhicules ---

/**
 * Liste paginée en « scroll infini » : pages chargées à la demande, conservées
 * en mémoire (la virtualisation UI ne garde que les lignes visibles). Tout
 * changement de `status`/`type`/`q`/`sort` recrée la query et repart de 0.
 */
export function useInfiniteVehicles(
  companyId: string,
  params: Omit<ListVehiclesParams, "page">,
) {
  return useInfiniteQuery({
    queryKey: vehicleKeys.infiniteList(companyId, params),
    queryFn: ({ pageParam }) =>
      vehiclesApi.list(companyId, { ...params, page: pageParam }),
    enabled: Boolean(companyId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useVehicle(companyId: string, vehicleId: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(companyId, vehicleId),
    queryFn: () => vehiclesApi.get(companyId, vehicleId),
    enabled: Boolean(companyId) && Boolean(vehicleId),
  })
}

export function useCreateVehicle(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVehicleInput) =>
      vehiclesApi.create(companyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(vehicleKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
    },
  })
}

export function useUpdateVehicle(companyId: string, vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateVehicleInput) =>
      vehiclesApi.update(companyId, vehicleId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(vehicleKeys.detail(companyId, vehicleId), data)
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
    },
  })
}

export function useArchiveVehicle(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vehicleId: string) =>
      vehiclesApi.archive(companyId, vehicleId),
    onSuccess: (data) => {
      queryClient.setQueryData(vehicleKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
    },
  })
}

export function useRestoreVehicle(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vehicleId: string) =>
      vehiclesApi.restore(companyId, vehicleId),
    onSuccess: (data) => {
      queryClient.setQueryData(vehicleKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
    },
  })
}

export function useDeleteVehicle(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vehicleId: string) => vehiclesApi.remove(companyId, vehicleId),
    onSuccess: (_data, vehicleId) => {
      queryClient.removeQueries({
        queryKey: vehicleKeys.detail(companyId, vehicleId),
      })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
      } else if (error instanceof ApiError && error.status === 403) {
        queryClient.invalidateQueries({ queryKey: authKeys.me })
      }
    },
  })
}

// --- Documents ---

export function useVehicleDocuments(
  companyId: string,
  vehicleId: string,
  category?: DocumentCategory,
) {
  return useQuery({
    queryKey: vehicleKeys.documents(companyId, vehicleId, category),
    queryFn: () => vehiclesApi.listDocuments(companyId, vehicleId, category),
    enabled: Boolean(companyId) && Boolean(vehicleId),
  })
}

/**
 * Charge le contenu binaire d'un document (Bearer requis) sous forme de `Blob`,
 * mis en cache - utilisé pour les vignettes des photos. Le composant crée
 * l'object URL à partir du `Blob` et la révoque au démontage.
 */
export function useVehicleDocumentBlob(
  companyId: string,
  vehicleId: string,
  documentId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: vehicleKeys.documentBlob(companyId, vehicleId, documentId),
    queryFn: () =>
      vehiclesApi.downloadDocument(companyId, vehicleId, documentId),
    enabled: enabled && Boolean(companyId) && Boolean(vehicleId),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })
}

export function useUploadDocument(companyId: string, vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UploadDocumentInput) =>
      vehiclesApi.uploadDocument(companyId, vehicleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.documents(companyId, vehicleId),
      })
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.detail(companyId, vehicleId),
      })
    },
  })
}

export function useDeleteDocument(companyId: string, vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      vehiclesApi.deleteDocument(companyId, vehicleId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.documents(companyId, vehicleId),
      })
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.detail(companyId, vehicleId),
      })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({
          queryKey: vehicleKeys.documents(companyId, vehicleId),
        })
      } else if (error instanceof ApiError && error.status === 403) {
        queryClient.invalidateQueries({ queryKey: authKeys.me })
      }
    },
  })
}

// --- Relevés kilométriques ---

export function useInfiniteMileage(
  companyId: string,
  vehicleId: string,
  size = 20,
) {
  return useInfiniteQuery({
    queryKey: vehicleKeys.mileage(companyId, vehicleId),
    queryFn: ({ pageParam }) =>
      vehiclesApi.listMileage(companyId, vehicleId, { page: pageParam, size }),
    enabled: Boolean(companyId) && Boolean(vehicleId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useCreateMileage(companyId: string, vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMileageReadingInput) =>
      vehiclesApi.createMileage(companyId, vehicleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.mileage(companyId, vehicleId),
      })
      // Le dernier km du véhicule peut changer → détail + listes.
      queryClient.invalidateQueries({
        queryKey: vehicleKeys.detail(companyId, vehicleId),
      })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.lists(companyId) })
    },
  })
}
