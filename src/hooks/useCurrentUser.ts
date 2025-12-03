import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"

export type UserRole = "admin" | "manager" | "teller" | "compliance"

export interface CurrentUser {
  _id: string
  userId: string
  firstName: string
  lastName: string
  role: UserRole
  branchId?: string
  branchName?: string
  branchCode?: string
  email: string
  isActive: boolean
  transactionLimitPerDay?: number
  enable2FA?: boolean
  isVerified?: boolean
}

export function useCurrentUser() {
  const profile = useQuery(api.users.getCurrentUserProfile)

  return {
    user: profile as CurrentUser | null | undefined,
    isLoading: profile === undefined,
    isAdmin: profile?.role === "admin",
    isManager: profile?.role === "manager" || profile?.role === "admin",
    isTeller: profile?.role === "teller",
    isCompliance: profile?.role === "compliance" || profile?.role === "admin",
    hasRole: (roles: UserRole[]) => roles.includes(profile?.role as UserRole),
  }
}
