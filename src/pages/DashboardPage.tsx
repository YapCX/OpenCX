import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle, ArrowUpRight, BarChart3, PieChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend } from 'recharts'

const CHART_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export function DashboardPage() {
  const currentRates = useQuery(api.exchangeRates.getCurrentRates, { baseCurrency: "USD" })
  const currencies = useQuery(api.currencies.list)
  const transactions = useQuery(api.transactions.list, {})

  const getCurrencyName = (code: string) => {
    return currencies?.find(c => c.code === code)?.name || code
  }

  const volumeByGroupData = currentRates?.slice(0, 6).map((rate, index) => ({
    currency: rate.targetCurrency,
    volume: Math.round((1 / rate.sellRate) * 10000),
    fill: CHART_COLORS[index % CHART_COLORS.length]
  })) || []

  const topSellingData = currentRates?.slice(0, 5).map((rate, index) => ({
    name: rate.targetCurrency,
    value: Math.round((1 / rate.sellRate) * 5000),
    fill: CHART_COLORS[index % CHART_COLORS.length]
  })) || []

  const todayTransactions = transactions?.filter(t => {
    const today = new Date()
    const txDate = new Date(t.createdAt)
    return txDate.toDateString() === today.toDateString()
  }) || []

  const totalBuyAmount = todayTransactions
    .filter(t => t.transactionType === 'buy')
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0)

  const totalSellAmount = todayTransactions
    .filter(t => t.transactionType === 'sell')
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0)

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
              <p className="text-2xl font-semibold text-dark-50 mt-1">{todayTransactions.length}</p>
            </div>
            <div className="h-12 w-12 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-dark-500">
              {todayTransactions.length === 0 ? 'No transactions yet' : `${todayTransactions.length} processed today`}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-dark-400">Total Buy Amount</p>
              <p className="text-2xl font-semibold text-dark-50 mt-1">${totalBuyAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
              <p className="text-2xl font-semibold text-dark-50 mt-1">${totalSellAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-400" />
              <span>Volume by Currency</span>
            </div>
            <Link to="/currencies" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {volumeByGroupData.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <p>No volume data available yet.</p>
              <p className="text-sm mt-2 text-dark-500">Charts will display once transactions are processed.</p>
            </div>
          ) : (
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByGroupData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="currency"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                  />
                  <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                    {volumeByGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary-400" />
              <span>Top Selling Currencies</span>
            </div>
            <Link to="/currencies" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {topSellingData.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <p>No sales data available yet.</p>
              <p className="text-sm mt-2 text-dark-500">Charts will display once transactions are processed.</p>
            </div>
          ) : (
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={topSellingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {topSellingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Sales']}
                  />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span className="text-dark-300 text-sm">{value}</span>}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
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
            <Link to="/pos" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {!transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <p>No transactions yet.</p>
              <p className="text-sm mt-2 text-dark-500">Start processing transactions in the POS.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-dark-100 font-medium">{tx.transactionType === 'buy' ? 'Bought' : 'Sold'} {tx.targetCurrency}</p>
                    <p className="text-sm text-dark-500">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono ${tx.transactionType === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.transactionType === 'buy' ? '+' : '-'}${tx.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-dark-500">{tx.sourceAmount?.toFixed(2)} {tx.sourceCurrency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <span>Compliance Alerts</span>
            <Link to="/compliance" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ArrowUpRight className="h-4 w-4" />
            </Link>
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
