import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  History,
  Search,
  Filter,
  RefreshCw,
  User,
  FileText,
  Shield,
  DollarSign,
  Users,
  GitBranch,
  Calendar,
} from 'lucide-react'

const ACTION_ICONS: Record<string, typeof History> = {
  transaction_created: DollarSign,
  transaction_voided: DollarSign,
  user_created: Users,
  user_updated: Users,
  user_activated: Users,
  user_deactivated: Users,
  customer_created: User,
  customer_updated: User,
  branch_created: GitBranch,
  branch_updated: GitBranch,
  compliance_reviewed: Shield,
  default: History,
}

const ACTION_COLORS: Record<string, string> = {
  transaction_created: 'bg-green-900/30 text-green-400',
  transaction_voided: 'bg-red-900/30 text-red-400',
  user_created: 'bg-blue-900/30 text-blue-400',
  user_updated: 'bg-blue-900/30 text-blue-400',
  user_activated: 'bg-green-900/30 text-green-400',
  user_deactivated: 'bg-orange-900/30 text-orange-400',
  customer_created: 'bg-purple-900/30 text-purple-400',
  customer_updated: 'bg-purple-900/30 text-purple-400',
  compliance_reviewed: 'bg-yellow-900/30 text-yellow-400',
  default: 'bg-dark-700 text-dark-300',
}

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'transaction', label: 'Transactions' },
  { value: 'user', label: 'Users' },
  { value: 'customer', label: 'Customers' },
  { value: 'branch', label: 'Branches' },
  { value: 'currency', label: 'Currencies' },
  { value: 'compliance', label: 'Compliance' },
]

export function AuditLogPage() {
  const [entityType, setEntityType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const getDateFilterStart = () => {
    const now = new Date()
    switch (dateFilter) {
      case 'today':
        now.setHours(0, 0, 0, 0)
        return now.getTime()
      case 'week':
        return now.getTime() - 7 * 24 * 60 * 60 * 1000
      case 'month':
        return now.getTime() - 30 * 24 * 60 * 60 * 1000
      default:
        return undefined
    }
  }

  const auditEntries = useQuery(api.audit.list, {
    entityType: entityType || undefined,
    startDate: getDateFilterStart(),
    limit: 200,
  })

  const stats = useQuery(api.audit.getStats)

  const filteredEntries = auditEntries?.filter((entry) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      entry.action.toLowerCase().includes(searchLower) ||
      entry.entityType.toLowerCase().includes(searchLower) ||
      entry.details?.toLowerCase().includes(searchLower) ||
      entry.userName?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Audit Log</h1>
          <p className="text-dark-400">Track all user actions and system events</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <History className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Total Events</p>
                <p className="text-xl font-semibold text-dark-50">{stats.totalEntries}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Today</p>
                <p className="text-xl font-semibold text-dark-50">{stats.todayEntries}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">This Week</p>
                <p className="text-xl font-semibold text-dark-50">{stats.weekEntries}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">Active Users</p>
                <p className="text-xl font-semibold text-dark-50">{stats.uniqueUsers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-dark-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, user, or details..."
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="input w-48"
            >
              {ENTITY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="input w-40"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {!filteredEntries ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-dark-500" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto mb-3 text-dark-600" />
            <p className="text-dark-400">No audit entries found.</p>
            <p className="text-sm text-dark-500 mt-1">
              Actions will appear here as users interact with the system.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const IconComponent = ACTION_ICONS[entry.action] || ACTION_ICONS.default
              const colorClass = ACTION_COLORS[entry.action] || ACTION_COLORS.default

              return (
                <div
                  key={entry._id}
                  className="flex items-start gap-4 p-4 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-dark-100">
                        {formatAction(entry.action)}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-dark-700 text-dark-300 rounded">
                        {entry.entityType}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-dark-400 text-sm mt-1 truncate">{entry.details}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.userName}
                      </span>
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
