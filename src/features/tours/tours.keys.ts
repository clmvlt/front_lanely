import type { ListToursParams } from "./types"

export const tourKeys = {
  all: ["tours"] as const,
  company: (companyId: string) => [...tourKeys.all, companyId] as const,
  lists: (companyId: string) => [...tourKeys.company(companyId), "list"] as const,
  infiniteList: (companyId: string, params: Omit<ListToursParams, "page">) =>
    [...tourKeys.lists(companyId), "infinite", params] as const,
  detail: (companyId: string, tourId: string) =>
    [...tourKeys.company(companyId), tourId] as const,
  statusHistory: (companyId: string, tourId: string) =>
    [...tourKeys.detail(companyId, tourId), "status-history"] as const,
}
