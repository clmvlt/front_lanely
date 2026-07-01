import { http } from "@/lib/http"
import type {
  PageResponse,
  StatusHistoryEntry,
  StatusHistoryParams,
} from "@/lib/transport-types"
import type {
  AssignWaybillRequest,
  BulkArchiveRequest,
  BulkCancelRequest,
  BulkResultResponse,
  BulkStatusRequest,
  ChangeParcelStatusRequest,
  ChangeWaybillStatusRequest,
  CreateWaybillRequest,
  DockSummaryResponse,
  ListDockParams,
  ListWaybillsParams,
  SignatureDto,
  UpdateWaybillRequest,
  WaybillResponse,
  WaybillSummaryResponse,
} from "./types"

function base(companyId: string): string {
  return `/companies/${companyId}/waybills`
}

function dockBase(companyId: string): string {
  return `/companies/${companyId}/dock`
}

export const waybillsApi = {
  list: (companyId: string, params: ListWaybillsParams) =>
    http.get<PageResponse<WaybillSummaryResponse>>(base(companyId), {
      query: { ...params },
    }),

  get: (companyId: string, waybillId: string) =>
    http.get<WaybillResponse>(`${base(companyId)}/${waybillId}`),

  create: (companyId: string, input: CreateWaybillRequest) =>
    http.post<WaybillResponse>(base(companyId), input),

  update: (companyId: string, waybillId: string, input: UpdateWaybillRequest) =>
    http.patch<WaybillResponse>(`${base(companyId)}/${waybillId}`, input),

  changeStatus: (
    companyId: string,
    waybillId: string,
    input: ChangeWaybillStatusRequest,
  ) =>
    http.post<WaybillResponse>(`${base(companyId)}/${waybillId}/status`, input),

  changeParcelStatus: (
    companyId: string,
    waybillId: string,
    parcelId: string,
    input: ChangeParcelStatusRequest,
  ) =>
    http.post<WaybillResponse>(
      `${base(companyId)}/${waybillId}/parcels/${parcelId}/status`,
      input,
    ),

  statusHistory: (
    companyId: string,
    waybillId: string,
    params: StatusHistoryParams,
  ) =>
    http.get<PageResponse<StatusHistoryEntry>>(
      `${base(companyId)}/${waybillId}/status-history`,
      { query: { ...params } },
    ),

  parcelStatusHistory: (
    companyId: string,
    waybillId: string,
    parcelId: string,
    params: StatusHistoryParams,
  ) =>
    http.get<PageResponse<StatusHistoryEntry>>(
      `${base(companyId)}/${waybillId}/parcels/${parcelId}/status-history`,
      { query: { ...params } },
    ),

  addSignature: (companyId: string, waybillId: string, input: SignatureDto) =>
    http.post<WaybillResponse>(
      `${base(companyId)}/${waybillId}/signatures`,
      input,
    ),

  assign: (companyId: string, waybillId: string, input: AssignWaybillRequest) =>
    http.post<WaybillResponse>(`${base(companyId)}/${waybillId}/assign`, input),

  cancel: (companyId: string, waybillId: string) =>
    http.delete<WaybillResponse>(`${base(companyId)}/${waybillId}`),

  archive: (companyId: string, waybillId: string) =>
    http.post<WaybillResponse>(`${base(companyId)}/${waybillId}/archive`),

  unarchive: (companyId: string, waybillId: string) =>
    http.post<WaybillResponse>(`${base(companyId)}/${waybillId}/unarchive`),

  bulkStatus: (companyId: string, input: BulkStatusRequest) =>
    http.post<BulkResultResponse>(`${base(companyId)}/bulk/status`, input),

  bulkArchive: (companyId: string, input: BulkArchiveRequest) =>
    http.post<BulkResultResponse>(`${base(companyId)}/bulk/archive`, input),

  bulkCancel: (companyId: string, input: BulkCancelRequest) =>
    http.post<BulkResultResponse>(`${base(companyId)}/bulk/cancel`, input),

  // --- Quai (« à quai ») : lecture seule ---

  dockList: (companyId: string, params: ListDockParams) =>
    http.get<PageResponse<WaybillSummaryResponse>>(dockBase(companyId), {
      query: { ...params },
    }),

  dockSummary: (companyId: string) =>
    http.get<DockSummaryResponse>(`${dockBase(companyId)}/summary`),
}
