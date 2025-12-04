import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useCurrentUser } from '../hooks/useCurrentUser'

interface Branch {
  _id: Id<"branches">
  name: string
  code: string
  isActive: boolean
}

interface BranchContextType {
  currentBranch: Branch | null
  setCurrentBranch: (branch: Branch | null) => void
  availableBranches: Branch[]
  isLoading: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser()
  const branches = useQuery(api.branches.list)
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)

  const activeBranches = branches?.filter(b => b.isActive) || []

  useEffect(() => {
    if (!currentBranch && activeBranches.length > 0) {
      if (user?.branchId) {
        const userBranch = activeBranches.find(b => b._id === user.branchId)
        if (userBranch) {
          setCurrentBranch(userBranch)
          return
        }
      }
      const savedBranchId = localStorage.getItem('selectedBranchId')
      if (savedBranchId) {
        const savedBranch = activeBranches.find(b => b._id === savedBranchId)
        if (savedBranch) {
          setCurrentBranch(savedBranch)
          return
        }
      }
      setCurrentBranch(activeBranches[0])
    }
  }, [activeBranches, currentBranch, user?.branchId])

  const handleSetCurrentBranch = (branch: Branch | null) => {
    setCurrentBranch(branch)
    if (branch) {
      localStorage.setItem('selectedBranchId', branch._id)
    } else {
      localStorage.removeItem('selectedBranchId')
    }
  }

  const isRoamingUser = !user?.branchId
  const availableBranches = isRoamingUser
    ? activeBranches
    : activeBranches.filter(b => b._id === user?.branchId)

  return (
    <BranchContext.Provider
      value={{
        currentBranch,
        setCurrentBranch: handleSetCurrentBranch,
        availableBranches,
        isLoading: branches === undefined,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}
