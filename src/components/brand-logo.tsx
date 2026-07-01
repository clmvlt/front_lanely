import { cn } from "@/lib/utils"
import logoMark from "@/assets/logos/logo_L_no_bg.png"

interface BrandLogoProps {
  className?: string
  /** N'afficher que la pastille (sans le texte). */
  markOnly?: boolean
}

export function BrandLogo({ className, markOnly = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={logoMark}
        alt="Lanely"
        className="size-9 shrink-0 object-contain"
      />
      {!markOnly && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Lanely
        </span>
      )}
    </span>
  )
}
