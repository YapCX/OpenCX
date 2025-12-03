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
import { Layout } from './components/common/Layout'
import { LoadingSpinner } from './components/common/LoadingSpinner'

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
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/pos" element={<POSPage />} />
                  <Route path="/currencies" element={<CurrenciesPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/modules" element={<ModulesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
