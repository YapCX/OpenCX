import { ReactNode, useState } from 'react'
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
} from 'lucide-react'
import clsx from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS', href: '/pos', icon: Receipt },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Compliance', href: '/compliance', icon: Shield },
  { name: 'Treasury', href: '/treasury', icon: Vault },
  { name: 'Accounting', href: '/accounting', icon: BookOpen },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { signOut } = useAuthActions()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = () => {
    void signOut()
  }

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
          'fixed inset-y-0 left-0 z-30 w-64 bg-dark-900 border-r border-dark-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
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

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
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
        </nav>

        <div className="border-t border-dark-700 p-4">
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
    </div>
  )
}
