import { http } from "@/lib/http"
import type { PageResponse } from "@/lib/transport-types"
import type {
  CreateTariffComponentRequest,
  CreateTariffRequest,
  CurrentFuelPriceParams,
  FuelPriceHistoryParams,
  FuelPriceResponse,
  FuelSurchargePolicyResponse,
  ListTariffsParams,
  QuoteRequest,
  QuoteResponse,
  RecalculateWaybillPriceRequest,
  RefreshFuelPricesResponse,
  TariffResponse,
  TariffSummaryResponse,
  UpdateTariffComponentRequest,
  UpdateTariffRequest,
  UpsertFuelSurchargePolicyRequest,
} from "./types"

function tariffsBase(companyId: string): string {
  return `/companies/${companyId}/tariffs`
}

function componentsBase(companyId: string, tariffId: string): string {
  return `${tariffsBase(companyId)}/${tariffId}/components`
}

function fuelPricesBase(companyId: string): string {
  return `/companies/${companyId}/fuel-prices`
}

export const pricingApi = {
  // --- Grilles tarifaires ---

  listTariffs: (companyId: string, params: ListTariffsParams) =>
    http.get<PageResponse<TariffSummaryResponse>>(tariffsBase(companyId), {
      query: { ...params },
    }),

  getTariff: (companyId: string, tariffId: string) =>
    http.get<TariffResponse>(`${tariffsBase(companyId)}/${tariffId}`),

  createTariff: (companyId: string, input: CreateTariffRequest) =>
    http.post<TariffResponse>(tariffsBase(companyId), input),

  updateTariff: (companyId: string, tariffId: string, input: UpdateTariffRequest) =>
    http.patch<TariffResponse>(`${tariffsBase(companyId)}/${tariffId}`, input),

  activateTariff: (companyId: string, tariffId: string) =>
    http.post<TariffResponse>(`${tariffsBase(companyId)}/${tariffId}/activate`),

  deactivateTariff: (companyId: string, tariffId: string) =>
    http.post<TariffResponse>(`${tariffsBase(companyId)}/${tariffId}/deactivate`),

  deleteTariff: (companyId: string, tariffId: string) =>
    http.delete<void>(`${tariffsBase(companyId)}/${tariffId}`),

  // --- Composants (renvoient la grille complète mise à jour) ---

  addComponent: (
    companyId: string,
    tariffId: string,
    input: CreateTariffComponentRequest,
  ) => http.post<TariffResponse>(componentsBase(companyId, tariffId), input),

  updateComponent: (
    companyId: string,
    tariffId: string,
    componentId: string,
    input: UpdateTariffComponentRequest,
  ) =>
    http.patch<TariffResponse>(
      `${componentsBase(companyId, tariffId)}/${componentId}`,
      input,
    ),

  deleteComponent: (companyId: string, tariffId: string, componentId: string) =>
    http.delete<TariffResponse>(
      `${componentsBase(companyId, tariffId)}/${componentId}`,
    ),

  // --- Politique carburant ---

  upsertFuelSurcharge: (
    companyId: string,
    tariffId: string,
    input: UpsertFuelSurchargePolicyRequest,
  ) =>
    http.put<FuelSurchargePolicyResponse>(
      `${tariffsBase(companyId)}/${tariffId}/fuel-surcharge`,
      input,
    ),

  deleteFuelSurcharge: (companyId: string, tariffId: string) =>
    http.delete<void>(`${tariffsBase(companyId)}/${tariffId}/fuel-surcharge`),

  // --- Prix carburant ---

  currentFuelPrice: (companyId: string, params: CurrentFuelPriceParams) =>
    http.get<FuelPriceResponse>(`${fuelPricesBase(companyId)}/current`, {
      query: { ...params },
    }),

  fuelPriceHistory: (companyId: string, params: FuelPriceHistoryParams) =>
    http.get<PageResponse<FuelPriceResponse>>(
      `${fuelPricesBase(companyId)}/history`,
      { query: { ...params } },
    ),

  refreshFuelPrices: (companyId: string) =>
    http.post<RefreshFuelPricesResponse>(`${fuelPricesBase(companyId)}/refresh`),

  // --- Devis & application sur waybill ---

  quote: (companyId: string, input: QuoteRequest) =>
    http.post<QuoteResponse>(`/companies/${companyId}/pricing/quote`, input),

  recalculateWaybill: (
    companyId: string,
    waybillId: string,
    input?: RecalculateWaybillPriceRequest,
  ) =>
    http.post<QuoteResponse>(
      `/companies/${companyId}/waybills/${waybillId}/pricing/recalculate`,
      input ?? {},
    ),
}
