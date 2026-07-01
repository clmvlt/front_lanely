import { useEffect, useRef } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Loader2, XCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/http"
import { hasSession } from "@/lib/auth"
import { getErrorMessage } from "@/lib/api-error"
import { useResendVerification, useVerifyEmail } from "@/features/auth"

type VerifyErrorKey =
  | "verify.errorNotFound"
  | "verify.errorExpired"
  | "verify.errorUsed"

function describeError(error: unknown): VerifyErrorKey | null {
  if (error instanceof ApiError) {
    const message = error.body?.message ?? ""
    if (error.status === 404) return "verify.errorNotFound"
    if (error.status === 400 && /expired/i.test(message)) return "verify.errorExpired"
    if (error.status === 400 && /already/i.test(message)) return "verify.errorUsed"
  }
  return null
}

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""

  const { mutateAsync, isError, error } = useVerifyEmail()
  const resend = useResendVerification()
  const fired = useRef(false)

  useEffect(() => {
    if (!token || fired.current) return
    fired.current = true
    mutateAsync(token)
      .then(() => navigate("/app", { replace: true }))
      .catch(() => {})
  }, [token, mutateAsync, navigate])

  const missing = !token
  const errorKey = describeError(error)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        {missing || isError ? (
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="size-6" />
          </span>
        ) : (
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
        <CardTitle>{t("verify.title")}</CardTitle>
        <CardDescription>
          {missing
            ? t("verify.missingToken")
            : isError
              ? t("verify.errorTitle")
              : t("verify.verifying")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        {isError && (
          <p className="text-sm text-destructive">
            {errorKey ? t(errorKey) : getErrorMessage(error)}
          </p>
        )}

        {isError && hasSession() && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => resend.mutate()}
            disabled={resend.isPending || resend.isSuccess}
          >
            {resend.isSuccess ? t("verify.resent") : t("verify.resend")}
          </Button>
        )}

        {(missing || isError) && (
          <Button asChild className="w-full">
            <Link to="/app">{t("verify.goToApp")}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
