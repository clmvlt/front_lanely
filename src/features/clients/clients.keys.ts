import type { ListClientsParams } from "./types"

export const clientKeys = {
  all: ["clients"] as const,
  company: (companyId: string) => [...clientKeys.all, companyId] as const,
  lists: (companyId: string) =>
    [...clientKeys.company(companyId), "list"] as const,
  infiniteList: (companyId: string, params: Omit<ListClientsParams, "page">) =>
    [...clientKeys.lists(companyId), "infinite", params] as const,
  detail: (companyId: string, clientId: string) =>
    [...clientKeys.company(companyId), clientId] as const,
}
