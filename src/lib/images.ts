import { config } from "@/lib/config"

export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  const base = config.apiBaseUrl.replace(/\/+$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}
