import { http } from "@/lib/http"
import type {
  AcceptInvitationInput,
  AcceptInvitationResponse,
  CreateInvitationInput,
  InvitationResponse,
} from "./types"

export const invitationsApi = {
  create: (companyId: string, input: CreateInvitationInput) =>
    http.post<InvitationResponse>(
      `/companies/${companyId}/invitations`,
      input,
    ),

  list: (companyId: string) =>
    http.get<InvitationResponse[]>(`/companies/${companyId}/invitations`),

  remove: (companyId: string, invitationId: string) =>
    http.delete<void>(`/companies/${companyId}/invitations/${invitationId}`),

  accept: (input: AcceptInvitationInput) =>
    http.post<AcceptInvitationResponse>("/invitations/accept", input),
}
