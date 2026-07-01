import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import "@/i18n"
import App from "./App.tsx"
import { AuthProvider } from "@/app/auth-context"
import { CompanyProvider } from "@/app/company-context"
import { applyColorTokens } from "@/lib/colors"
import { queryClient } from "@/lib/query-client"
import { config } from "@/lib/config"

applyColorTokens()

const ReactQueryDevtools = config.isDev
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <App />
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
      <Suspense>
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
)
