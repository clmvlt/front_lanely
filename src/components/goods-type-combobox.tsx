import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import {
  useGoodsTypeSearch,
  type GoodsTypeResponse,
} from "@/features/goods-types"

interface GoodsTypeComboboxProps {
  companyId: string
  id: string
  label: string
  /** Texte libre courant (description de la ligne de marchandise). */
  value: string
  /** Saisie libre : met à jour le texte sans rien pré-remplir. */
  onChange: (value: string) => void
  /** Sélection d'un type du catalogue : pré-remplit la ligne avec ses défauts. */
  onSelectType: (type: GoodsTypeResponse) => void
  error?: string
  disabled?: boolean
}

/**
 * Champ « nom de marchandise » en saisie libre, avec auto-complétion sur le
 * catalogue de types de la société (`goods-types?q=`). Sélectionner une
 * suggestion recopie le nom ET pré-remplit la ligne via `onSelectType` ; la
 * ligne reste ensuite librement modifiable et indépendante du catalogue.
 */
export function GoodsTypeCombobox({
  companyId,
  id,
  label,
  value,
  onChange,
  onSelectType,
  error,
  disabled,
}: GoodsTypeComboboxProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(value.trim(), 300)

  const query = useGoodsTypeSearch(companyId, debounced, open)
  const results = query.data?.content ?? []

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  const pick = (type: GoodsTypeResponse) => {
    onChange(type.name)
    onSelectType(type)
    setOpen(false)
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div ref={containerRef} className="relative">
        <Input
          id={id}
          value={value}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />

        {open && (results.length > 0 || query.isFetching) && (
          <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {query.isFetching && results.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t("common.loading")}
              </p>
            ) : (
              results.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => pick(type)}
                  className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{type.name}</span>
                    {type.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {type.description}
                      </span>
                    )}
                  </span>
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
