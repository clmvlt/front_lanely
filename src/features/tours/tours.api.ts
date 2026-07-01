import { http } from "@/lib/http"
import type {
  PageResponse,
  StatusHistoryEntry,
  StatusHistoryParams,
} from "@/lib/transport-types"
import type {
  AssignTourRequest,
  ChangeTourStatusRequest,
  CreateTourRequest,
  ListToursParams,
  RoutePreviewRequest,
  RoutePreviewResponse,
  SetTourWaybillsRequest,
  TourOptimizeResponse,
  TourResponse,
  TourSummaryResponse,
  UpdateTourRequest,
} from "./types"

function base(companyId: string): string {
  return `/companies/${companyId}/tours`
}

export const toursApi = {
  list: (companyId: string, params: ListToursParams) =>
    http.get<PageResponse<TourSummaryResponse>>(base(companyId), {
      query: { ...params },
    }),

  get: (companyId: string, tourId: string) =>
    http.get<TourResponse>(`${base(companyId)}/${tourId}`),

  create: (companyId: string, input: CreateTourRequest) =>
    http.post<TourResponse>(base(companyId), input),

  update: (companyId: string, tourId: string, input: UpdateTourRequest) =>
    http.patch<TourResponse>(`${base(companyId)}/${tourId}`, input),

  assign: (companyId: string, tourId: string, input: AssignTourRequest) =>
    http.post<TourResponse>(`${base(companyId)}/${tourId}/assign`, input),

  setWaybills: (
    companyId: string,
    tourId: string,
    input: SetTourWaybillsRequest,
  ) => http.post<TourResponse>(`${base(companyId)}/${tourId}/waybills`, input),

  optimize: (companyId: string, tourId: string) =>
    http.post<TourOptimizeResponse>(`${base(companyId)}/${tourId}/optimize`),

  /** Calcule un trajet sans rien persister (preview temps réel). */
  routePreview: (
    companyId: string,
    tourId: string,
    input: RoutePreviewRequest,
  ) =>
    http.post<RoutePreviewResponse>(
      `${base(companyId)}/${tourId}/route/preview`,
      input,
    ),

  /** Persiste l'ordre + le trajet. */
  saveRoute: (companyId: string, tourId: string, input: RoutePreviewRequest) =>
    http.post<TourResponse>(`${base(companyId)}/${tourId}/route`, input),

  changeStatus: (
    companyId: string,
    tourId: string,
    input: ChangeTourStatusRequest,
  ) => http.post<TourResponse>(`${base(companyId)}/${tourId}/status`, input),

  statusHistory: (
    companyId: string,
    tourId: string,
    params: StatusHistoryParams,
  ) =>
    http.get<PageResponse<StatusHistoryEntry>>(
      `${base(companyId)}/${tourId}/status-history`,
      { query: { ...params } },
    ),

  cancel: (companyId: string, tourId: string) =>
    http.delete<TourResponse>(`${base(companyId)}/${tourId}`),
}
