import i18n from "@/i18n"
import { config } from "@/lib/config"
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  UNAUTHORIZED_EVENT,
  type TokenResponse,
} from "@/lib/auth"

/** Langue active du site, envoyée en `Accept-Language` pour localiser les
 * messages renvoyés par l'API (validation, erreurs métier…). */
function currentLanguage(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? "en"
}

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorBody {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  path?: string
  fieldErrors?: FieldError[]
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: ApiErrorBody,
  ) {
    super(message)
    this.name = "ApiError"
  }

  get fieldErrors(): FieldError[] {
    return this.body?.fieldErrors ?? []
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number>
>

export interface RequestOptions extends Omit<RequestInit, "body"> {
  query?: QueryParams
  body?: unknown
  auth?: boolean
  timeoutMs?: number
  /**
   * URL de base alternative (sans slash final). Par defaut l'API Spring Boot
   * (`config.apiBaseUrl`). A utiliser pour une API externe (ex. ORS) tout en
   * conservant le client central (serialisation, query params, `ApiError`).
   */
  baseUrl?: string
}

const DEFAULT_TIMEOUT_MS = 20_000

function buildUrl(path: string, query?: QueryParams, baseUrl?: string): string {
  const base = (baseUrl ?? config.apiBaseUrl).replace(/\/+$/, "")
  const url = new URL(
    `${base}${path.startsWith("/") ? path : `/${path}`}`,
    window.location.origin,
  )

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(key, String(item))
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? ""
  try {
    // `application/json` et aussi `application/problem+json` (erreurs RFC 7807,
    // ex. les 503 renvoyes par l'API ORS quand une brique n'a pas ses donnees).
    if (contentType.includes("json")) return await res.json()
    const text = await res.text()
    return text || undefined
  } catch {
    return undefined
  }
}

let refreshPromise: Promise<boolean> | null = null

export async function refreshSession(): Promise<boolean> {
  const token = getRefreshToken()
  if (!token) return false

  refreshPromise ??= (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": currentLanguage(),
        },
        body: JSON.stringify({ refreshToken: token }),
      })
      if (!res.ok) return false
      setTokens((await res.json()) as TokenResponse)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function rawRequest(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const {
    query,
    body,
    auth = true,
    headers,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    baseUrl,
    ...rest
  } = options
  const url = buildUrl(path, query, baseUrl)
  const isFormData = body instanceof FormData
  const payload =
    body === undefined
      ? undefined
      : isFormData
        ? (body as FormData)
        : JSON.stringify(body)

  const send = () => {
    const finalHeaders = new Headers(headers)
    if (body !== undefined && !isFormData) {
      finalHeaders.set("Content-Type", "application/json")
    }
    if (!finalHeaders.has("Accept-Language")) {
      finalHeaders.set("Accept-Language", currentLanguage())
    }
    if (auth) {
      const token = getAccessToken()
      if (token) finalHeaders.set("Authorization", `Bearer ${token}`)
    }
    return fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      signal: signal ?? AbortSignal.timeout(timeoutMs),
      ...rest,
    })
  }

  let res = await send()

  if (res.status === 401 && auth && path !== "/auth/refresh") {
    const refreshed = await refreshSession()
    if (refreshed) {
      res = await send()
    } else {
      clearTokens()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      `API ${res.status} ${method} ${path}`,
      (await parseBody(res)) as ApiErrorBody,
    )
  }

  return res
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await rawRequest(method, path, options)
  if (res.status === 204) return undefined as T
  return (await parseBody(res)) as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
  /**
   * Télécharge la réponse brute (octets) en `Blob` - pour les fichiers protégés
   * par le Bearer token (documents véhicule). Réutilise l'auth + refresh + la
   * gestion d'erreurs `ApiError` du client central.
   */
  blob: (path: string, options?: RequestOptions) =>
    rawRequest("GET", path, options).then((res) => res.blob()),
}
