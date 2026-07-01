/**
 * Robustesse d'un mot de passe, de 0 (vide) à 4 (fort).
 * Heuristique purement indicative côté UI - la validation fait foi côté serveur.
 */
export function passwordScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}
