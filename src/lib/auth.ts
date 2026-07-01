export interface TokenResponse {
  accessToken: string
  tokenType: string
  accessExpiresInSeconds: number
  refreshToken: string
  refreshExpiresInSeconds: number
}

const REFRESH_KEY = "lanely.refreshToken"

let accessToken: string | null = null
let refreshToken: string | null | undefined

export function getAccessToken(): string | null {
  return accessToken
}

export function getRefreshToken(): string | null {
  if (refreshToken === undefined) {
    refreshToken = localStorage.getItem(REFRESH_KEY)
  }
  return refreshToken
}

export function setTokens(tokens: TokenResponse): void {
  accessToken = tokens.accessToken
  refreshToken = tokens.refreshToken
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
}

export function clearTokens(): void {
  accessToken = null
  refreshToken = null
  localStorage.removeItem(REFRESH_KEY)
}

export function hasSession(): boolean {
  return Boolean(getRefreshToken())
}

export const UNAUTHORIZED_EVENT = "lanely:unauthorized"

export function onUnauthorized(handler: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, handler)
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler)
}
