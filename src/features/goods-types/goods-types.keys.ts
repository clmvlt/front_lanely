import type { ListGoodsTypesParams } from "./types"

export const goodsTypeKeys = {
  all: ["goods-types"] as const,
  company: (companyId: string) => [...goodsTypeKeys.all, companyId] as const,
  lists: (companyId: string) =>
    [...goodsTypeKeys.company(companyId), "list"] as const,
  infiniteList: (
    companyId: string,
    params: Omit<ListGoodsTypesParams, "page">,
  ) => [...goodsTypeKeys.lists(companyId), "infinite", params] as const,
  search: (companyId: string, q: string) =>
    [...goodsTypeKeys.lists(companyId), "search", q] as const,
  detail: (companyId: string, goodsTypeId: string) =>
    [...goodsTypeKeys.company(companyId), goodsTypeId] as const,
}
