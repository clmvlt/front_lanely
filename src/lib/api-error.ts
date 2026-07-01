import { ApiError } from "@/lib/http"

export function getErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (error instanceof ApiError) {
    return error.body?.message ?? error.message
  }
  if (error instanceof Error) return error.message
  return String(error)
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError) {
    return Object.fromEntries(
      error.fieldErrors.map((fe) => [fe.field, fe.message]),
    )
  }
  return {}
}
