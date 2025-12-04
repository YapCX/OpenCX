import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from '../../../convex/_generated/api'
import { ShieldX } from 'lucide-react'

export function UserProfileInitializer({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.users.getCurrentUserProfile)
  const seedCurrentUser = useMutation(api.users.seedCurrentUser)
  const { signOut } = useAuthActions()
  const [isDeactivated, setIsDeactivated] = useState(false)

  useEffect(() => {
    if (profile === null) {
      seedCurrentUser({ firstName: 'Admin', lastName: 'User' })
    }
  }, [profile, seedCurrentUser])

  useEffect(() => {
    if (profile && profile.isActive === false) {
      setIsDeactivated(true)
      const timeout = setTimeout(() => {
        signOut()
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [profile, signOut])

  if (isDeactivated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="card max-w-md text-center">
          <div className="h-16 w-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-dark-50 mb-2">Account Deactivated</h2>
          <p className="text-dark-400 mb-4">
            Your account has been deactivated by an administrator. You will be signed out automatically.
          </p>
          <p className="text-sm text-dark-500">
            Please contact your system administrator if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
