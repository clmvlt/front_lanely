import * as React from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface TextareaFieldProps extends React.ComponentProps<"textarea"> {
  id: string
  label: string
  error?: string
  hint?: string
}

export function TextareaField({
  id,
  label,
  error,
  hint,
  ...textareaProps
}: TextareaFieldProps) {
  const message = error ?? hint
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} aria-invalid={Boolean(error)} {...textareaProps} />
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
