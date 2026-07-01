import type { DocumentCategory, ListVehiclesParams } from "./types"

export const vehicleKeys = {
  all: ["vehicles"] as const,
  company: (companyId: string) => [...vehicleKeys.all, companyId] as const,
  lists: (companyId: string) =>
    [...vehicleKeys.company(companyId), "list"] as const,
  infiniteList: (companyId: string, params: Omit<ListVehiclesParams, "page">) =>
    [...vehicleKeys.lists(companyId), "infinite", params] as const,
  detail: (companyId: string, vehicleId: string) =>
    [...vehicleKeys.company(companyId), vehicleId] as const,
  documents: (companyId: string, vehicleId: string, category?: DocumentCategory) =>
    [
      ...vehicleKeys.detail(companyId, vehicleId),
      "documents",
      category ?? "all",
    ] as const,
  documentBlob: (companyId: string, vehicleId: string, documentId: string) =>
    [
      ...vehicleKeys.detail(companyId, vehicleId),
      "documents",
      documentId,
      "blob",
    ] as const,
  mileage: (companyId: string, vehicleId: string) =>
    [...vehicleKeys.detail(companyId, vehicleId), "mileage"] as const,
}
