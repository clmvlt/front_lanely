import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * Retour « intelligent » à utiliser pour TOUT bouton « retour » d'une page.
 *
 * Revient à l'entrée précédente de l'historique quand c'est possible (donc en
 * conservant son URL complète : filtres de recherche, pagination, onglet
 * actif...), sinon retombe sur `fallback` (cas d'un accès direct / lien
 * partagé, où il n'y a pas d'historique applicatif).
 *
 * Ne JAMAIS recoder un bouton retour avec `navigate("/chemin/fixe")` : ça écrase
 * l'état de l'écran d'origine (ex. la recherche de l'utilisateur est perdue).
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(() => {
    // `key === "default"` => première entrée de la session (aucun écran
    // précédent dans le routeur) : on ne peut pas faire `navigate(-1)`.
    if (location.key !== "default") navigate(-1)
    else navigate(fallback)
  }, [navigate, location.key, fallback])
}
