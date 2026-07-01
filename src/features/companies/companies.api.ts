import { http } from "@/lib/http"
import type { Permission } from "@/lib/permissions"
import type {
  CompanyByCode,
  CompanyCode,
  CompanyMe,
  CompanyMember,
  CompanyResponse,
  CreateCompanyInput,
  MemberPermissions,
  PermissionInfo,
  UpdateCompanyInput,
} from "./types"

const RESOURCE = "/companies"

function pictureForm(file: File): FormData {
  const form = new FormData()
  form.append("file", file)
  return form
}

export const companiesApi = {
  create: (input: CreateCompanyInput) =>
    http.post<CompanyResponse>(RESOURCE, input),

  get: (id: string) => http.get<CompanyResponse>(`${RESOURCE}/${id}`),

  me: (id: string) => http.get<CompanyMe>(`${RESOURCE}/${id}/me`),

  members: (id: string) =>
    http.get<CompanyMember[]>(`${RESOURCE}/${id}/members`),

  code: (id: string) => http.get<CompanyCode>(`${RESOURCE}/${id}/code`),

  byCode: (publicCode: string) =>
    http.get<CompanyByCode>(`${RESOURCE}/by-code/${publicCode}`, {
      auth: false,
    }),

  update: (id: string, input: UpdateCompanyInput) =>
    http.patch<CompanyResponse>(`${RESOURCE}/${id}`, input),

  updatePicture: (id: string, file: File) =>
    http.put<CompanyResponse>(`${RESOURCE}/${id}/picture`, pictureForm(file)),

  deletePicture: (id: string) =>
    http.delete<CompanyResponse>(`${RESOURCE}/${id}/picture`),

  permissionCatalog: () =>
    http.get<PermissionInfo[]>(`${RESOURCE}/permissions`),

  memberPermissions: (id: string, userId: string) =>
    http.get<MemberPermissions>(
      `${RESOURCE}/${id}/members/${userId}/permissions`,
    ),

  setMemberPermissions: (id: string, userId: string, permissions: Permission[]) =>
    http.put<MemberPermissions>(
      `${RESOURCE}/${id}/members/${userId}/permissions`,
      { permissions },
    ),
}
