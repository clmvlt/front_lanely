import { http } from "@/lib/http"
import type { PageResponse } from "@/lib/transport-types"
import type {
  CreateGoodsTypeRequest,
  GoodsTypeResponse,
  ListGoodsTypesParams,
  UpdateGoodsTypeRequest,
} from "./types"

function base(companyId: string): string {
  return `/companies/${companyId}/goods-types`
}

export const goodsTypesApi = {
  list: (companyId: string, params: ListGoodsTypesParams) =>
    http.get<PageResponse<GoodsTypeResponse>>(base(companyId), {
      query: { ...params },
    }),

  get: (companyId: string, goodsTypeId: string) =>
    http.get<GoodsTypeResponse>(`${base(companyId)}/${goodsTypeId}`),

  create: (companyId: string, input: CreateGoodsTypeRequest) =>
    http.post<GoodsTypeResponse>(base(companyId), input),

  update: (
    companyId: string,
    goodsTypeId: string,
    input: UpdateGoodsTypeRequest,
  ) =>
    http.patch<GoodsTypeResponse>(`${base(companyId)}/${goodsTypeId}`, input),

  remove: (companyId: string, goodsTypeId: string) =>
    http.delete<void>(`${base(companyId)}/${goodsTypeId}`),
}
