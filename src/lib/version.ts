/**
 * Detection des mises a jour du frontend (SPA bundle unique, assets haches).
 *
 * Au build, Vite fige `__BUILD_ID__` dans le bundle et ecrit le meme identifiant
 * dans `dist/version.json`. Apres un deploiement, le `version.json` servi change
 * tandis que le bundle deja charge garde son ancien `APP_VERSION` : la difference
 * signale qu'une nouvelle version est en ligne et qu'il faut recharger.
 */

/** Version figee dans le bundle actuellement charge par le navigateur. */
export const APP_VERSION =
  typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev"

/**
 * Lit la version actuellement deployee depuis `/version.json` (sans cache).
 * Renvoie `null` si le fichier est absent (dev) ou injoignable (hors ligne).
 */
export async function fetchDeployedVersion(
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch("/version.json", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: unknown }
    return typeof data.version === "string" ? data.version : null
  } catch {
    return null
  }
}
