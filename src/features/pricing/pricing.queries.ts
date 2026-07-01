import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { waybillKeys } from "@/features/waybills/waybills.keys"
import { pricingApi } from "./pricing.api"
import { pricingKeys } from "./pricing.keys"
import type {
  CreateTariffComponentRequest,
  CreateTariffRequest,
  CurrentFuelPriceParams,
  FuelPriceHistoryParams,
  ListTariffsParams,
  QuoteRequest,
  RecalculateWaybillPriceRequest,
  UpdateTariffComponentRequest,
  UpdateTariffRequest,
  UpsertFuelSurchargePolicyRequest,
} from "./types"

// --- Grilles tarifaires ---

export function useTariffs(
  companyId: string,
  params: Omit<ListTariffsParams, "page"> & { page?: number } = {},
) {
  return useQuery({
    queryKey: pricingKeys.tariffList(companyId, params),
    queryFn: () => pricingApi.listTariffs(companyId, params),
    enabled: Boolean(companyId),
  })
}

export function useTariff(companyId: string, tariffId: string) {
  return useQuery({
    queryKey: pricingKeys.tariffDetail(companyId, tariffId),
    queryFn: () => pricingApi.getTariff(companyId, tariffId),
    enabled: Boolean(companyId) && Boolean(tariffId),
  })
}

export function useCreateTariff(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTariffRequest) =>
      pricingApi.createTariff(companyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, data.id),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

export function useUpdateTariff(companyId: string, tariffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTariffRequest) =>
      pricingApi.updateTariff(companyId, tariffId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, tariffId),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

/**
 * Activer une grille (passe en ACTIVE). Échoue en 400 `error.tariff.default-exists`
 * si une autre grille par défaut est déjà active.
 */
export function useActivateTariff(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tariffId: string) =>
      pricingApi.activateTariff(companyId, tariffId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, data.id),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

export function useDeactivateTariff(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tariffId: string) =>
      pricingApi.deactivateTariff(companyId, tariffId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, data.id),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

export function useDeleteTariff(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tariffId: string) =>
      pricingApi.deleteTariff(companyId, tariffId),
    onSuccess: (_data, tariffId) => {
      queryClient.removeQueries({
        queryKey: pricingKeys.tariffDetail(companyId, tariffId),
      })
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

// --- Composants (toutes les réponses = grille complète mise à jour) ---

export function useAddTariffComponent(companyId: string, tariffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTariffComponentRequest) =>
      pricingApi.addComponent(companyId, tariffId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, tariffId),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

export function useUpdateTariffComponent(companyId: string, tariffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      componentId,
      input,
    }: {
      componentId: string
      input: UpdateTariffComponentRequest
    }) =>
      pricingApi.updateComponent(companyId, tariffId, componentId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, tariffId),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

export function useDeleteTariffComponent(companyId: string, tariffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (componentId: string) =>
      pricingApi.deleteComponent(companyId, tariffId, componentId),
    onSuccess: (data) => {
      queryClient.setQueryData(
        pricingKeys.tariffDetail(companyId, tariffId),
        data,
      )
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

// --- Politique carburant (modifie la grille -> invalider son détail) ---

export function useUpsertFuelSurcharge(companyId: string, tariffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertFuelSurchargePolicyRequest) =>
      pricingApi.upsertFuelSurcharge(companyId, tariffId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pricingKeys.tariffDetail(companyId, tariffId),
      })
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

export function useDeleteFuelSurcharge(companyId: string, tariffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => pricingApi.deleteFuelSurcharge(companyId, tariffId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pricingKeys.tariffDetail(companyId, tariffId),
      })
      queryClient.invalidateQueries({ queryKey: pricingKeys.tariffs(companyId) })
    },
  })
}

// --- Prix carburant ---

/** Prix carburant courant. 404 `error.fuel.no-index` si aucun prix stocké. */
export function useCurrentFuelPrice(
  companyId: string,
  params: CurrentFuelPriceParams = {},
) {
  return useQuery({
    queryKey: pricingKeys.fuelPriceCurrent(companyId, params),
    queryFn: () => pricingApi.currentFuelPrice(companyId, params),
    enabled: Boolean(companyId),
  })
}

export function useFuelPriceHistory(
  companyId: string,
  params: FuelPriceHistoryParams = {},
) {
  return useQuery({
    queryKey: pricingKeys.fuelPriceHistory(companyId, params),
    queryFn: () => pricingApi.fuelPriceHistory(companyId, params),
    enabled: Boolean(companyId),
  })
}

/** Rafraîchit les prix depuis la source gouv (502/503 si source en erreur). */
export function useRefreshFuelPrices(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => pricingApi.refreshFuelPrices(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pricingKeys.fuelPrices(companyId),
      })
    },
  })
}

// --- Devis & application sur waybill ---

/**
 * Estimation idempotente d'un prix (sans persistance). À garder désactivée tant
 * que la requête n'est pas exploitable (ni `waybillId` ni `inputs`).
 */
export function useQuote(
  companyId: string,
  request: QuoteRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: pricingKeys.quote(companyId, request),
    queryFn: () => pricingApi.quote(companyId, request),
    enabled: Boolean(companyId) && enabled,
  })
}

/**
 * Estimation à la demande (bouton) : `quote` en mutation, sans persistance ni
 * cache. Pratique pour préremplir un montant depuis un formulaire.
 */
export function useQuoteMutation(companyId: string) {
  return useMutation({
    mutationFn: (request: QuoteRequest) => pricingApi.quote(companyId, request),
  })
}

/**
 * Recalcule et écrit le tarif sur un bordereau (écriture, MANAGE_TRANSPORTS).
 * Interdit sur un waybill CANCELLED (400 `error.pricing.not-applicable`).
 */
export function useRecalculateWaybillPrice(companyId: string, waybillId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input?: RecalculateWaybillPriceRequest) =>
      pricingApi.recalculateWaybill(companyId, waybillId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: waybillKeys.detail(companyId, waybillId),
      })
      queryClient.invalidateQueries({ queryKey: waybillKeys.lists(companyId) })
    },
  })
}
