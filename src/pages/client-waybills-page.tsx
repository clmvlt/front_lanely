import { useParams } from "react-router-dom"
import { CompanyShell } from "@/components/company-shell"
import { WaybillsList } from "@/pages/waybills-page"

/**
 * Lettres de voiture d'un donneur d'ordre : même écran que la liste générale
 * (`WaybillsList`), filtré sur le `clientId` de l'URL et coiffé d'un en-tête
 * « retour client + nom ». Le design reste strictement identique à la page de
 * liste des lettres de voiture.
 */
export function ClientWaybillsPage() {
  const { clientId = "" } = useParams()
  return (
    <CompanyShell showHeader={false}>
      {(company) => <WaybillsList company={company} clientId={clientId} />}
    </CompanyShell>
  )
}
