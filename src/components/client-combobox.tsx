import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { clientsApi, clientKeys, type ClientSummaryResponse } from "@/features/clients"

interface ClientComboboxProps {
  companyId: string
  id: string
  label: string
  /** Id du client sélectionné (ou null). */
  value: string | null
  /** Libellé à afficher pour la sélection courante. */
  selectedLabel?: string | null
  onSelect: (client: ClientSummaryResponse | null) => void
  disabled?: boolean
  error?: string
}

/** Sélecteur de client existant (recherche `q` débouncée sur l'API clients). */
export function ClientCombobox({
  companyId,
  id,
  label,
  value,
  selectedLabel,
  onSelect,
  disabled,
  error,
}: ClientComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debounced = useDebouncedValue(search.trim(), 300)

  const params = { status: "ACTIVE" as const, q: debounced || undefined, size: 20 }
  const query = useQuery({
    queryKey: [...clientKeys.lists(companyId), "combobox", params],
    queryFn: () => clientsApi.list(companyId, params),
    enabled: Boolean(companyId) && open,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const results = query.data?.content ?? []

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div ref={containerRef} className="relative">
        {value ? (
          <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
            <span className="min-w-0 flex-1 truncate">
              {selectedLabel ?? value}
            </span>
            {!disabled && (
              <button
                type="button"
                aria-label={t("transport.party.clearClient")}
                onClick={() => onSelect(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={id}
              value={search}
              autoComplete="off"
              disabled={disabled}
              aria-invalid={Boolean(error)}
              placeholder={t("transport.party.searchClient")}
              className="pl-9"
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </>
        )}

        {open && !value && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {query.isFetching ? (
              <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("common.loading")}
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t("transport.party.noClients")}
              </p>
            ) : (
              results.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    onSelect(client)
                    setOpen(false)
                    setSearch("")
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{client.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {client.reference}
                    </span>
                  </span>
                  {client.id === value && (
                    <Check className="size-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p
        className={cn(
          "min-h-4 text-xs",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {error}
      </p>
    </div>
  )
}
