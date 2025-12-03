import { TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, ArrowUpRight } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to OpenCX - Currency Exchange Management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Transactions</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">0</p>
            </div>
            <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">No transactions yet</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Buy Amount</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">$0.00</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            Currency purchased today
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sell Amount</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">$0.00</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            Currency sold today
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">0</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            Registered customers
          </div>
        </div>
      </div>

      {/* Exchange Rates Panel */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span>Current Exchange Rates</span>
          <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View All <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>Exchange rates will be displayed here once configured.</p>
          <p className="text-sm mt-2">Configure rate sources in Settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Recent Transactions</span>
            <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <p>No transactions yet.</p>
            <p className="text-sm mt-2">Start processing transactions in the POS.</p>
          </div>
        </div>

        {/* Compliance Alerts */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Compliance Alerts</span>
            <button className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center py-8 text-gray-500">
            <div className="flex justify-center mb-3">
              <AlertTriangle className="h-8 w-8 text-gray-400" />
            </div>
            <p>No active alerts.</p>
            <p className="text-sm mt-2">Compliance alerts will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
