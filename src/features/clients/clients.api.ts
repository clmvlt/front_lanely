import { http } from "@/lib/http"
import type {
  ClientAddressResponse,
  ClientContactResponse,
  ClientResponse,
  ClientSummaryResponse,
  CreateClientAddressInput,
  CreateClientContactInput,
  CreateClientInput,
  ListClientsParams,
  PageResponse,
  UpdateClientAddressInput,
  UpdateClientContactInput,
  UpdateClientInput,
} from "./types"

function base(companyId: string): string {
  return `/companies/${companyId}/clients`
}

export const clientsApi = {
  list: (companyId: string, params: ListClientsParams) =>
    http.get<PageResponse<ClientSummaryResponse>>(base(companyId), {
      query: { ...params },
    }),

  get: (companyId: string, clientId: string) =>
    http.get<ClientResponse>(`${base(companyId)}/${clientId}`),

  create: (companyId: string, input: CreateClientInput) =>
    http.post<ClientResponse>(base(companyId), input),

  update: (companyId: string, clientId: string, input: UpdateClientInput) =>
    http.patch<ClientResponse>(`${base(companyId)}/${clientId}`, input),

  archive: (companyId: string, clientId: string) =>
    http.post<ClientResponse>(`${base(companyId)}/${clientId}/archive`),

  // Suppression définitive (client déjà ARCHIVED requis). 204 sans corps.
  delete: (companyId: string, clientId: string) =>
    http.delete<void>(`${base(companyId)}/${clientId}`),

  restore: (companyId: string, clientId: string) =>
    http.post<ClientResponse>(`${base(companyId)}/${clientId}/restore`),

  // Adresses
  createAddress: (
    companyId: string,
    clientId: string,
    input: CreateClientAddressInput,
  ) =>
    http.post<ClientAddressResponse>(
      `${base(companyId)}/${clientId}/addresses`,
      input,
    ),

  updateAddress: (
    companyId: string,
    clientId: string,
    addressId: string,
    input: UpdateClientAddressInput,
  ) =>
    http.patch<ClientAddressResponse>(
      `${base(companyId)}/${clientId}/addresses/${addressId}`,
      input,
    ),

  deleteAddress: (companyId: string, clientId: string, addressId: string) =>
    http.delete<void>(
      `${base(companyId)}/${clientId}/addresses/${addressId}`,
    ),

  // Contacts
  createContact: (
    companyId: string,
    clientId: string,
    input: CreateClientContactInput,
  ) =>
    http.post<ClientContactResponse>(
      `${base(companyId)}/${clientId}/contacts`,
      input,
    ),

  updateContact: (
    companyId: string,
    clientId: string,
    contactId: string,
    input: UpdateClientContactInput,
  ) =>
    http.patch<ClientContactResponse>(
      `${base(companyId)}/${clientId}/contacts/${contactId}`,
      input,
    ),

  deleteContact: (companyId: string, clientId: string, contactId: string) =>
    http.delete<void>(`${base(companyId)}/${clientId}/contacts/${contactId}`),
}
