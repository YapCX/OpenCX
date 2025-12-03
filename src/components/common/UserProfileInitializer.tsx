import { useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function UserProfileInitializer({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.users.getCurrentUserProfile)
  const seedCurrentUser = useMutation(api.users.seedCurrentUser)

  useEffect(() => {
    if (profile === null) {
      seedCurrentUser({ firstName: 'Admin', lastName: 'User' })
    }
  }, [profile, seedCurrentUser])

  return <>{children}</>
}
