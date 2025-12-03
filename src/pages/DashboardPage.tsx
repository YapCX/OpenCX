import { TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, ArrowUpRight } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Dashboard</h1>
        <p className="text-dark-400">Welcome to OpenCX - Currency Exchange Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-400">Today's Transactions</p>
              <p className="text-2xl font-semibold text-dark-50 mt-1">0</p>
            </div>
            <div className="h-12 w-12 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-dark-500">No transactions yet</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-400">Total Buy Amount</p>
              <p className="text-2xl font-semibold text-dark-50 mt-1">$0.00</p>
            </div>
            <div className="h-12 w-12 bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-dark-500">
            Currency purchased today
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-400">Total Sell Amount</p>
              <p className="text-2xl font-semibold text-dark-50 mt-1">$0.00</p>
            </div>
            <div className="h-12 w-12 bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-dark-500">
            Currency sold today
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-400">Active Customers</p>
              <p className="text-2xl font-semibold text-dark-50 mt-1">0</p>
            </div>
            <div className="h-12 w-12 bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-dark-500">
            Registered customers
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span>Current Exchange Rates</span>
          <button className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View All <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center py-8 text-dark-400">
          <p>Exchange rates will be displayed here once configured.</p>
          <p className="text-sm mt-2 text-dark-500">Configure rate sources in Settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Recent Transactions</span>
            <button className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center py-8 text-dark-400">
            <p>No transactions yet.</p>
            <p className="text-sm mt-2 text-dark-500">Start processing transactions in the POS.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Compliance Alerts</span>
            <button className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center py-8 text-dark-400">
            <div className="flex justify-center mb-3">
              <AlertTriangle className="h-8 w-8 text-dark-600" />
            </div>
            <p>No active alerts.</p>
            <p className="text-sm mt-2 text-dark-500">Compliance alerts will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
