import { useTranslation } from "react-i18next"
import { Check, Globe } from "lucide-react"
import { supportedLanguages } from "@/i18n"
import { cn } from "@/lib/utils"

/** Noms de langue affichés dans leur propre langue (endonymes). */
const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language

  return (
    <div className={cn("group relative", className)}>
      <button
        type="button"
        aria-label={t("language.label")}
        className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 group-hover:bg-accent group-hover:text-accent-foreground"
      >
        <Globe className="size-4" />
      </button>

      {/* Le pt-1 sert de pont invisible pour ne pas perdre le survol. */}
      <div className="invisible absolute right-0 top-full z-50 pt-1 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {supportedLanguages.map((lng) => {
            const active = current === lng
            return (
              <li key={lng}>
                <button
                  type="button"
                  onClick={(event) => {
                    i18n.changeLanguage(lng)
                    // Garder le focus sur l'élément (certains navigateurs ne
                    // focalisent pas un bouton au clic) → `:focus-within`
                    // maintient le menu ouvert après le changement de langue.
                    event.currentTarget.focus()
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                    active ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-xs font-semibold uppercase">
                      {lng}
                    </span>
                    {LANGUAGE_LABELS[lng] ?? lng}
                  </span>
                  {active && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
