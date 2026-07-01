import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/app/auth-context"
import type { CompanyMembership } from "@/features/auth"

const STORAGE_KEY = "lanely.companyId"

interface CompanyContextValue {
  companies: CompanyMembership[]
  selectedCompany: CompanyMembership | null
  selectCompany: (companyId: string) => void
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const companies = user?.companies ?? []

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  // L'entreprise sélectionnée doit toujours faire partie de celles de
  // l'utilisateur ; à défaut on retombe sur la première (ou null si aucune).
  const selectedCompany =
    companies.find((c) => c.companyId === selectedId) ?? companies[0] ?? null

  useEffect(() => {
    const id = selectedCompany?.companyId ?? null
    if (id === selectedId) return
    setSelectedId(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [selectedCompany, selectedId])

  const selectCompany = (companyId: string) => {
    setSelectedId(companyId)
    localStorage.setItem(STORAGE_KEY, companyId)
  }

  const value: CompanyContextValue = {
    companies,
    selectedCompany,
    selectCompany,
  }

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  )
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error("useCompany must be used within a CompanyProvider")
  return ctx
}
