import type * as React from "react"
import { ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options?: SelectOption[]
  /** Options groupées (`optgroup`). Les groupes vides sont ignorés. */
  groups?: SelectOptionGroup[]
  error?: string
  hint?: string
  disabled?: boolean
  /** Libellé de l'option vide (aucune sélection). */
  placeholder?: string
  /** Masque visuellement le libellé (conservé pour l'accessibilité). */
  hideLabel?: boolean
  /** Masque la ligne de message réservée (rangées compactes). */
  hideMessage?: boolean
}

/**
 * Sélecteur natif aligné sur le style de `FormField` / `CountryField`
 * (réserve la ligne de message pour éviter les sauts de mise en page).
 */
export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  groups,
  error,
  hint,
  disabled,
  placeholder,
  hideLabel,
  hideMessage,
}: SelectFieldProps) {
  const message = error ?? hint
  const renderOption = (option: SelectOption) => (
    <option key={option.value} value={option.value} className="text-foreground">
      {option.label}
    </option>
  )
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className={cn(hideLabel && "sr-only")}>
        {label}
      </Label>
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
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options?.map(renderOption)}
          {groups
            ?.filter((group) => group.options.length > 0)
            .map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map(renderOption)}
              </optgroup>
            ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {!hideMessage && (
        <p
          className={cn(
            "min-h-4 text-xs",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      )}
    </div>
  )
}

export type SelectFieldComponentProps = React.ComponentProps<typeof SelectField>
