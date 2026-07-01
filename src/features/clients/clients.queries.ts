import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { clientsApi } from "./clients.api"
import { clientKeys } from "./clients.keys"
import type {
  CreateClientAddressInput,
  CreateClientContactInput,
  CreateClientInput,
  ListClientsParams,
  UpdateClientAddressInput,
  UpdateClientContactInput,
  UpdateClientInput,
} from "./types"

/**
 * Liste paginée en mode « scroll infini » : chaque page suivante est chargée à
 * la demande et les pages déjà chargées restent en mémoire (la virtualisation
 * côté UI ne garde que les lignes visibles dans le DOM). Le `size` reste borné
 * (≤ 100 côté serveur). Tout changement de `status`/`q`/`sort` recrée la query
 * (nouvelle clé) et repart de la page 0.
 */
export function useInfiniteClients(
  companyId: string,
  params: Omit<ListClientsParams, "page">,
) {
  return useInfiniteQuery({
    queryKey: clientKeys.infiniteList(companyId, params),
    queryFn: ({ pageParam }) =>
      clientsApi.list(companyId, { ...params, page: pageParam }),
    enabled: Boolean(companyId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
  })
}

export function useClient(companyId: string, clientId: string) {
  return useQuery({
    queryKey: clientKeys.detail(companyId, clientId),
    queryFn: () => clientsApi.get(companyId, clientId),
    enabled: Boolean(companyId) && Boolean(clientId),
  })
}

export function useCreateClient(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      clientsApi.create(companyId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(clientKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) })
    },
  })
}

export function useUpdateClient(companyId: string, clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateClientInput) =>
      clientsApi.update(companyId, clientId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(clientKeys.detail(companyId, clientId), data)
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) })
    },
  })
}

export function useArchiveClient(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.archive(companyId, clientId),
    onSuccess: (data) => {
      queryClient.setQueryData(clientKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) })
    },
  })
}

/**
 * Suppression définitive d'un client (irréversible). Le client doit déjà être
 * ARCHIVED (sinon l'API renvoie 400). On retire son détail du cache et on
 * invalide les listes.
 */
export function useDeleteClient(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.delete(companyId, clientId),
    onSuccess: (_data, clientId) => {
      queryClient.removeQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      })
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) })
    },
  })
}

export function useRestoreClient(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (clientId: string) => clientsApi.restore(companyId, clientId),
    onSuccess: (data) => {
      queryClient.setQueryData(clientKeys.detail(companyId, data.id), data)
      queryClient.invalidateQueries({ queryKey: clientKeys.lists(companyId) })
    },
  })
}

// --- Adresses : la réponse détail du client porte addresses[]/contacts[],
//     donc on invalide simplement le détail après chaque mutation. ---

export function useCreateAddress(companyId: string, clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientAddressInput) =>
      clientsApi.createAddress(companyId, clientId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      }),
  })
}

export function useUpdateAddress(
  companyId: string,
  clientId: string,
  addressId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateClientAddressInput) =>
      clientsApi.updateAddress(companyId, clientId, addressId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      }),
  })
}

export function useDeleteAddress(companyId: string, clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (addressId: string) =>
      clientsApi.deleteAddress(companyId, clientId, addressId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      }),
  })
}

// --- Contacts ---

export function useCreateContact(companyId: string, clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientContactInput) =>
      clientsApi.createContact(companyId, clientId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      }),
  })
}

export function useUpdateContact(
  companyId: string,
  clientId: string,
  contactId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateClientContactInput) =>
      clientsApi.updateContact(companyId, clientId, contactId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      }),
  })
}

export function useDeleteContact(companyId: string, clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) =>
      clientsApi.deleteContact(companyId, clientId, contactId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: clientKeys.detail(companyId, clientId),
      }),
  })
}
