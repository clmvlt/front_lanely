import type { ListDockParams, ListWaybillsParams } from "./types"

export const waybillKeys = {
  all: ["waybills"] as const,
  company: (companyId: string) => [...waybillKeys.all, companyId] as const,
  lists: (companyId: string) =>
    [...waybillKeys.company(companyId), "list"] as const,
  infiniteList: (
    companyId: string,
    params: Omit<ListWaybillsParams, "page">,
  ) => [...waybillKeys.lists(companyId), "infinite", params] as const,
  detail: (companyId: string, waybillId: string) =>
    [...waybillKeys.company(companyId), waybillId] as const,
  statusHistory: (companyId: string, waybillId: string) =>
    [...waybillKeys.detail(companyId, waybillId), "status-history"] as const,
  parcelStatusHistory: (
    companyId: string,
    waybillId: string,
    parcelId: string,
  ) =>
    [
      ...waybillKeys.detail(companyId, waybillId),
      "parcels",
      parcelId,
      "status-history",
    ] as const,
  // Vue « à quai » : sous-arbre dédié, invalidé à chaque changement de statut.
  dock: (companyId: string) =>
    [...waybillKeys.company(companyId), "dock"] as const,
  dockList: (companyId: string, params: Omit<ListDockParams, "page">) =>
    [...waybillKeys.dock(companyId), "list", params] as const,
  dockSummary: (companyId: string) =>
    [...waybillKeys.dock(companyId), "summary"] as const,
}
