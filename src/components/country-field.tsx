import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { sortedCountries } from "@/lib/countries"

interface CountryFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  disabled?: boolean
  /** Libellé de l'option vide (aucun pays sélectionné). */
  placeholder?: string
}

export function CountryField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
  placeholder,
}: CountryFieldProps) {
  const { i18n } = useTranslation()
  const message = error ?? hint
  const countries = useMemo(
    () => sortedCountries(i18n.language),
    [i18n.language],
  )

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className={cn(
            "flex h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            !value && "text-muted-foreground",
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {countries.map((c) => (
            <option key={c.code} value={c.code} className="text-foreground">
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <p
        className={cn(
          "min-h-4 text-xs",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {message}
      </p>
    </div>
  )
}
