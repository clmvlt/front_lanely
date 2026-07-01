import type {
  CurrentFuelPriceParams,
  FuelPriceHistoryParams,
  ListTariffsParams,
  QuoteRequest,
} from "./types"

export const pricingKeys = {
  all: ["pricing"] as const,
  company: (companyId: string) => [...pricingKeys.all, companyId] as const,

  // --- Grilles tarifaires ---
  tariffs: (companyId: string) =>
    [...pricingKeys.company(companyId), "tariffs"] as const,
  tariffList: (companyId: string, params: Omit<ListTariffsParams, "page">) =>
    [...pricingKeys.tariffs(companyId), "list", params] as const,
  tariffDetail: (companyId: string, tariffId: string) =>
    [...pricingKeys.tariffs(companyId), tariffId] as const,

  // --- Prix carburant ---
  fuelPrices: (companyId: string) =>
    [...pricingKeys.company(companyId), "fuel-prices"] as const,
  fuelPriceCurrent: (companyId: string, params: CurrentFuelPriceParams) =>
    [...pricingKeys.fuelPrices(companyId), "current", params] as const,
  fuelPriceHistory: (
    companyId: string,
    params: Omit<FuelPriceHistoryParams, "page">,
  ) => [...pricingKeys.fuelPrices(companyId), "history", params] as const,

  // --- Devis (estimation idempotente, sans persistance) ---
  quote: (companyId: string, request: QuoteRequest) =>
    [...pricingKeys.company(companyId), "quote", request] as const,
}
