export const invitationKeys = {
  all: ["invitations"] as const,
  company: (companyId: string) =>
    [...invitationKeys.all, "company", companyId] as const,
}
