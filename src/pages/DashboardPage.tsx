import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const currentRates = useQuery(api.exchangeRates.getCurrentRates, { baseCurrency: "USD" })
  const currencies = useQuery(api.currencies.list)

  const getCurrencyName = (code: string) => {
    return currencies?.find(c => c.code === code)?.name || code
  }

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
          <Link to="/currencies" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            View All <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {!currentRates ? (
          <div className="text-center py-8 text-dark-400">
            <p>Loading exchange rates...</p>
          </div>
        ) : currentRates.length === 0 ? (
          <div className="text-center py-8 text-dark-400">
            <p>Exchange rates will be displayed here once configured.</p>
            <p className="text-sm mt-2 text-dark-500">
              Go to <Link to="/currencies" className="text-primary-400 hover:text-primary-300">Currencies</Link> to configure rates.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Currency</th>
                  <th className="text-right text-dark-400 font-medium py-3 px-4 text-sm">We Buy</th>
                  <th className="text-right text-dark-400 font-medium py-3 px-4 text-sm">We Sell</th>
                  <th className="text-right text-dark-400 font-medium py-3 px-4 text-sm">Spread</th>
                </tr>
              </thead>
              <tbody>
                {currentRates.slice(0, 5).map((rate) => (
                  <tr key={rate._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-medium">{rate.targetCurrency}</span>
                        <span className="text-dark-400 text-sm">{getCurrencyName(rate.targetCurrency)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-green-400 font-mono">{rate.buyRate.toFixed(4)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-red-400 font-mono">{rate.sellRate.toFixed(4)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-dark-400 font-mono text-sm">{rate.spread.toFixed(2)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRates.length > 5 && (
              <div className="text-center py-3 border-t border-dark-800">
                <Link to="/currencies" className="text-sm text-primary-400 hover:text-primary-300">
                  View all {currentRates.length} rates →
                </Link>
              </div>
            )}
          </div>
        )}
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
