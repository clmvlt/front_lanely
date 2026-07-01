import { http } from "@/lib/http"
import type {
  CreateMileageReadingInput,
  CreateVehicleInput,
  DocumentCategory,
  ListVehiclesParams,
  MileageReadingResponse,
  PageResponse,
  UpdateVehicleInput,
  UploadDocumentInput,
  VehicleDocumentResponse,
  VehicleResponse,
  VehicleSummaryResponse,
} from "./types"

function base(companyId: string): string {
  return `/companies/${companyId}/vehicles`
}

function documentsBase(companyId: string, vehicleId: string): string {
  return `${base(companyId)}/${vehicleId}/documents`
}

function mileageBase(companyId: string, vehicleId: string): string {
  return `${base(companyId)}/${vehicleId}/mileage-readings`
}

function uploadForm(input: UploadDocumentInput): FormData {
  const form = new FormData()
  form.append("file", input.file)
  form.append("category", input.category)
  if (input.label) form.append("label", input.label)
  return form
}

export const vehiclesApi = {
  // --- Véhicules ---
  list: (companyId: string, params: ListVehiclesParams) =>
    http.get<PageResponse<VehicleSummaryResponse>>(base(companyId), {
      query: { ...params },
    }),

  get: (companyId: string, vehicleId: string) =>
    http.get<VehicleResponse>(`${base(companyId)}/${vehicleId}`),

  create: (companyId: string, input: CreateVehicleInput) =>
    http.post<VehicleResponse>(base(companyId), input),

  update: (companyId: string, vehicleId: string, input: UpdateVehicleInput) =>
    http.patch<VehicleResponse>(`${base(companyId)}/${vehicleId}`, input),

  archive: (companyId: string, vehicleId: string) =>
    http.post<VehicleResponse>(`${base(companyId)}/${vehicleId}/archive`),

  restore: (companyId: string, vehicleId: string) =>
    http.post<VehicleResponse>(`${base(companyId)}/${vehicleId}/restore`),

  remove: (companyId: string, vehicleId: string) =>
    http.delete<void>(`${base(companyId)}/${vehicleId}`),

  // --- Documents ---
  listDocuments: (
    companyId: string,
    vehicleId: string,
    category?: DocumentCategory,
  ) =>
    http.get<VehicleDocumentResponse[]>(documentsBase(companyId, vehicleId), {
      query: { category },
    }),

  uploadDocument: (
    companyId: string,
    vehicleId: string,
    input: UploadDocumentInput,
  ) =>
    http.post<VehicleDocumentResponse>(
      documentsBase(companyId, vehicleId),
      uploadForm(input),
    ),

  downloadDocument: (companyId: string, vehicleId: string, documentId: string) =>
    http.blob(`${documentsBase(companyId, vehicleId)}/${documentId}/download`),

  deleteDocument: (companyId: string, vehicleId: string, documentId: string) =>
    http.delete<void>(
      `${documentsBase(companyId, vehicleId)}/${documentId}`,
    ),

  // --- Relevés kilométriques ---
  listMileage: (
    companyId: string,
    vehicleId: string,
    params: { page?: number; size?: number },
  ) =>
    http.get<PageResponse<MileageReadingResponse>>(
      mileageBase(companyId, vehicleId),
      { query: { ...params } },
    ),

  createMileage: (
    companyId: string,
    vehicleId: string,
    input: CreateMileageReadingInput,
  ) =>
    http.post<MileageReadingResponse>(
      mileageBase(companyId, vehicleId),
      input,
    ),
}
