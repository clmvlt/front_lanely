import { Navigate, Route, Routes } from "react-router-dom"
import { ProtectedRoute, PublicOnlyRoute } from "@/app/protected-route"
import { AuthLayout } from "@/layouts/auth-layout"
import { AppLayout } from "@/layouts/app-layout"
import { LandingPage } from "@/pages/landing-page"
import { LoginPage } from "@/pages/login-page"
import { RegisterPage } from "@/pages/register-page"
import { ForgotPasswordPage } from "@/pages/forgot-password-page"
import { ResetPasswordPage } from "@/pages/reset-password-page"
import { AcceptInvitationPage } from "@/pages/accept-invitation-page"
import { VerifyEmailPage } from "@/pages/verify-email-page"
import { CompanySettingsPage } from "@/pages/company-settings-page"
import { CompanyMembersPage } from "@/pages/company-members-page"
import { ClientsPage } from "@/pages/clients-page"
import { ClientFormPage } from "@/pages/client-form-page"
import { ClientDetailPage } from "@/pages/client-detail-page"
import { ClientWaybillsPage } from "@/pages/client-waybills-page"
import { VehiclesPage } from "@/pages/vehicles-page"
import { VehicleDetailPage } from "@/pages/vehicle-detail-page"
import { WaybillsPage } from "@/pages/waybills-page"
import { WaybillDetailPage } from "@/pages/waybill-detail-page"
import { DockPage } from "@/pages/dock-page"
import { ToursPage } from "@/pages/tours-page"
import { TourDetailPage } from "@/pages/tour-detail-page"
import { PricingPage } from "@/pages/pricing-page"
import { TariffDetailPage } from "@/pages/tariff-detail-page"
import { ProfilePage } from "@/pages/profile-page"
import { SubscriptionPage } from "@/pages/subscription-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { UpdateBanner } from "@/components/update-banner"

function App() {
  return (
    <>
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<AuthLayout />}>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route path="/join" element={<AcceptInvitationPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              path="/app"
              element={<Navigate to="/app/company/settings" replace />}
            />
            <Route
              path="/app/company/settings"
              element={<CompanySettingsPage />}
            />
            <Route
              path="/app/company/members"
              element={<CompanyMembersPage />}
            />
            <Route path="/app/company/clients" element={<ClientsPage />} />
            <Route
              path="/app/company/clients/new"
              element={<ClientFormPage />}
            />
            <Route
              path="/app/company/clients/:clientId/edit"
              element={<ClientFormPage />}
            />
            <Route
              path="/app/company/clients/:clientId/waybills"
              element={<ClientWaybillsPage />}
            />
            <Route
              path="/app/company/clients/:clientId"
              element={<ClientDetailPage />}
            />
            <Route path="/app/company/vehicles" element={<VehiclesPage />} />
            <Route
              path="/app/company/vehicles/:vehicleId"
              element={<VehicleDetailPage />}
            />
            <Route path="/app/company/waybills" element={<WaybillsPage />} />
            <Route
              path="/app/company/waybills/:waybillId"
              element={<WaybillDetailPage />}
            />
            <Route path="/app/company/pricing" element={<PricingPage />} />
            <Route
              path="/app/company/pricing/:tariffId"
              element={<TariffDetailPage />}
            />
            <Route path="/app/company/dock" element={<DockPage />} />
            <Route path="/app/company/tours" element={<ToursPage />} />
            <Route
              path="/app/company/tours/:tourId"
              element={<TourDetailPage />}
            />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route path="/app/subscription" element={<SubscriptionPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export default App
