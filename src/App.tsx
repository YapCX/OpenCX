import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useConvexAuth } from "convex/react"
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CurrenciesPage } from './pages/CurrenciesPage'
import { POSPage } from './pages/POSPage'
import { CustomersPage } from './pages/CustomersPage'
import { SettingsPage } from './pages/SettingsPage'
import { RateBoardPage } from './pages/RateBoardPage'
import { ModulesPage } from './pages/ModulesPage'
import { CompliancePage } from './pages/CompliancePage'
import { TreasuryPage } from './pages/TreasuryPage'
import { Layout } from './components/common/Layout'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { RoleProtectedRoute } from './components/common/RoleProtectedRoute'
import { UserProfileInitializer } from './components/common/UserProfileInitializer'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/rate-board" element={<RateBoardPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <UserProfileInitializer>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/pos" element={<POSPage />} />
                    <Route path="/currencies" element={<CurrenciesPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/treasury" element={<TreasuryPage />} />
                    <Route
                      path="/compliance"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "compliance"]}>
                          <CompliancePage />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/modules"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin", "manager"]}>
                          <ModulesPage />
                        </RoleProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <RoleProtectedRoute allowedRoles={["admin"]}>
                          <SettingsPage />
                        </RoleProtectedRoute>
                      }
                    />
                  </Routes>
                </Layout>
              </UserProfileInitializer>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
