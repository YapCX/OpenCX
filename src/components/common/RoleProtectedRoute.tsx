import { Navigate } from 'react-router-dom'
import { useCurrentUser, UserRole } from '../../hooks/useCurrentUser'
import { LoadingSpinner } from './LoadingSpinner'
import { ShieldAlert } from 'lucide-react'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
}

export function RoleProtectedRoute({
  children,
  allowedRoles,
  fallbackPath = '/dashboard'
}: RoleProtectedRouteProps) {
  const { user, isLoading, hasRole } = useCurrentUser()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole(allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-red-500/10 rounded-full p-6 mb-6">
          <ShieldAlert className="h-16 w-16 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-dark-50 mb-2">Access Denied</h1>
        <p className="text-dark-400 mb-6 max-w-md">
          You don't have permission to access this page. This section requires{' '}
          {allowedRoles.length === 1
            ? `${allowedRoles[0]} role`
            : `one of the following roles: ${allowedRoles.join(', ')}`}.
        </p>
        <a
          href={fallbackPath}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    )
  }

  return <>{children}</>
}
