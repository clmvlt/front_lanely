import { http } from "@/lib/http"
import type {
  CreateProfileInput,
  DeliveryProfile,
  UpdateProfileInput,
} from "./types"

function base(companyId: string): string {
  return `/companies/${companyId}/profiles`
}

export const profilesApi = {
  list: (companyId: string) =>
    http.get<DeliveryProfile[]>(base(companyId)),

  create: (companyId: string, input: CreateProfileInput) =>
    http.post<DeliveryProfile>(base(companyId), input),

  update: (companyId: string, profileId: string, input: UpdateProfileInput) =>
    http.patch<DeliveryProfile>(`${base(companyId)}/${profileId}`, input),

  remove: (companyId: string, profileId: string) =>
    http.delete<void>(`${base(companyId)}/${profileId}`),

  activate: (companyId: string, profileId: string) =>
    http.post<DeliveryProfile>(`${base(companyId)}/${profileId}/activate`),

  deactivate: (companyId: string, profileId: string) =>
    http.post<DeliveryProfile>(`${base(companyId)}/${profileId}/deactivate`),
}
