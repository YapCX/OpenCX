import { ReactNode, useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthActions } from "@convex-dev/auth/react"
import {
  LayoutDashboard,
  Receipt,
  Users,
  Shield,
  Vault,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  Coins,
  ChevronDown,
  Building2,
  GitBranch,
  Cog,
  UserCog,
  List,
  Layers,
  History,
  MapPin,
  User,
  Clock,
} from 'lucide-react'
import clsx from 'clsx'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useBranch } from '../../contexts/BranchContext'
import { useSessionTimeout } from '../../hooks/useSessionTimeout'

interface LayoutProps {
  children: ReactNode
}

type NavItem = {
  name: string
  href: string
  icon: typeof LayoutDashboard
  roles?: ('admin' | 'manager' | 'teller' | 'compliance')[]
}

const mainNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS', href: '/pos', icon: Receipt },
  { name: 'Currencies', href: '/currencies', icon: Coins },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Transactions', href: '/transactions', icon: List },
  { name: 'Compliance', href: '/compliance', icon: Shield, roles: ['admin', 'compliance'] },
  { name: 'Treasury', href: '/treasury', icon: Vault },
  { name: 'Accounting', href: '/accounting', icon: BookOpen },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Modules', href: '/modules', icon: Layers, roles: ['admin', 'manager'] },
]

const adminSubItems = [
  { name: 'Preferences', href: '/settings?tab=preferences', icon: Cog },
  { name: 'Company Profile', href: '/settings?tab=company', icon: Building2 },
  { name: 'Branches', href: '/settings?tab=branches', icon: GitBranch },
  { name: 'Users', href: '/settings?tab=users', icon: UserCog },
  { name: 'Lookups', href: '/settings?tab=lookups', icon: List },
  { name: 'Denominations', href: '/settings?tab=denominations', icon: Coins },
  { name: 'Audit Log', href: '/audit', icon: History },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { signOut } = useAuthActions()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminExpanded, setAdminExpanded] = useState(location.pathname.startsWith('/settings') || location.pathname === '/audit')
  const [branchSelectorOpen, setBranchSelectorOpen] = useState(false)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const { user, isAdmin } = useCurrentUser()
  const { currentBranch, setCurrentBranch, availableBranches } = useBranch()

  const handleTimeoutWarning = useCallback(() => {
    setShowTimeoutWarning(true)
  }, [])

  const handleTimeout = useCallback(() => {
    setShowTimeoutWarning(false)
  }, [])

  const { resetTimer } = useSessionTimeout({
    onWarning: handleTimeoutWarning,
    onTimeout: handleTimeout,
  })

  const canSwitchBranches = !user?.branchId && availableBranches.length > 1

  const handleSignOut = () => {
    void signOut()
  }

  const handleStayLoggedIn = () => {
    setShowTimeoutWarning(false)
    resetTimer()
  }

  const isAdminActive = location.pathname.startsWith('/settings') || location.pathname === '/audit'

  const filteredNavigation = mainNavigation.filter((item) => {
    if (!item.roles) return true
    if (!user) return false
    return item.roles.includes(user.role)
  })

  return (
    <div className="min-h-screen bg-dark-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 bg-dark-900 border-r border-dark-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-dark-700">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-500" />
            </div>
            <span className="text-xl font-bold text-dark-50">OpenCX</span>
          </div>
          <button
            className="lg:hidden p-2 rounded-md text-dark-400 hover:text-dark-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {currentBranch && (
          <div className="px-3 py-3 border-b border-dark-700">
            <div className="relative">
              <button
                onClick={() => canSwitchBranches && setBranchSelectorOpen(!branchSelectorOpen)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  canSwitchBranches
                    ? 'bg-dark-800 hover:bg-dark-700 cursor-pointer'
                    : 'bg-dark-800/50 cursor-default'
                )}
              >
                <MapPin className="h-4 w-4 text-primary-400" />
                <div className="flex-1 text-left">
                  <div className="text-dark-100 font-medium">{currentBranch.name}</div>
                  <div className="text-xs text-dark-500">{currentBranch.code}</div>
                </div>
                {canSwitchBranches && (
                  <ChevronDown className={clsx(
                    'h-4 w-4 text-dark-400 transition-transform',
                    branchSelectorOpen && 'rotate-180'
                  )} />
                )}
              </button>

              {branchSelectorOpen && canSwitchBranches && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                  {availableBranches.map((branch) => (
                    <button
                      key={branch._id}
                      onClick={() => {
                        setCurrentBranch(branch)
                        setBranchSelectorOpen(false)
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                        currentBranch._id === branch._id
                          ? 'bg-primary-600/20 text-primary-400'
                          : 'text-dark-300 hover:bg-dark-700'
                      )}
                    >
                      <MapPin className="h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">{branch.name}</div>
                        <div className="text-xs text-dark-500">{branch.code}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}

          {isAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setAdminExpanded(!adminExpanded)}
                className={clsx(
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isAdminActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5" />
                  Admin
                </div>
                <ChevronDown className={clsx(
                  'h-4 w-4 transition-transform',
                  adminExpanded && 'rotate-180'
                )} />
              </button>

              {adminExpanded && (
                <div className="mt-1 ml-4 pl-4 border-l border-dark-700 space-y-1">
                  {adminSubItems.map((item) => {
                    const isActive = item.href === '/audit'
                      ? location.pathname === '/audit'
                      : location.pathname === '/settings' &&
                        (location.search.includes(item.href.split('?tab=')[1]) ||
                         (!location.search && item.href.includes('branches')))
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'text-primary-400'
                            : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="border-t border-dark-700 p-4 space-y-1">
          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors",
              location.pathname === '/profile'
                ? 'bg-primary-600/20 text-primary-400'
                : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100'
            )}
          >
            <User className="h-5 w-5" />
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex items-center h-16 px-4 bg-dark-900/95 backdrop-blur border-b border-dark-700 lg:hidden">
          <button
            className="p-2 rounded-md text-dark-400 hover:text-dark-300"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2 ml-4">
            <div className="h-8 w-8 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-500" />
            </div>
            <span className="text-lg font-bold text-dark-50">OpenCX</span>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>

      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Session Timeout Warning</h3>
                <p className="text-sm text-dark-400">Your session is about to expire</p>
              </div>
            </div>
            <p className="text-dark-300 mb-6">
              Due to inactivity, you will be automatically logged out in less than 1 minute.
              Click "Stay Logged In" to continue your session.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 transition-colors"
              >
                Log Out Now
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
