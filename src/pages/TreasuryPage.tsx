import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  Vault,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Settings2,
  Package,
  History,
  DollarSign,
  Building2,
  X,
} from 'lucide-react'

type TabType = 'inventory' | 'movements' | 'wholesale' | 'alerts'

export function TreasuryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inventory')
  const [selectedBranch, setSelectedBranch] = useState<Id<'branches'> | ''>('')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [showWholesaleModal, setShowWholesaleModal] = useState(false)
  const [wholesaleType, setWholesaleType] = useState<'buy' | 'sell'>('buy')
  const [selectedCurrency, setSelectedCurrency] = useState('')

  const branches = useQuery(api.branches.list)
  const currencies = useQuery(api.currencies.list)
  const inventory = useQuery(api.treasury.getInventory, selectedBranch ? { branchId: selectedBranch } : {})
  const movements = useQuery(api.treasury.getMovements, {
    branchId: selectedBranch || undefined,
    limit: 50,
  })
  const lowAlerts = useQuery(api.treasury.getLowInventoryAlerts)

  const adjustInventory = useMutation(api.treasury.adjustInventory)
  const setThresholds = useMutation(api.treasury.setThresholds)
  const recordWholesaleBuy = useMutation(api.treasury.recordWholesaleBuy)
  const recordWholesaleSell = useMutation(api.treasury.recordWholesaleSell)
  const initializeInventory = useMutation(api.treasury.initializeInventory)

  const activeBranches = branches?.filter((b) => b.isActive) || []
  const activeCurrencies = currencies?.filter((c) => c.isActive) || []

  const tabs = [
    { id: 'inventory' as TabType, name: 'Currency Inventory', icon: Package },
    { id: 'movements' as TabType, name: 'Movements History', icon: History },
    { id: 'wholesale' as TabType, name: 'Wholesale Operations', icon: ArrowUpDown },
    { id: 'alerts' as TabType, name: 'Low Inventory Alerts', icon: AlertTriangle, badge: lowAlerts?.length || 0 },
  ]

  const handleInitializeInventory = async () => {
    if (!selectedBranch) return
    try {
      const result = await initializeInventory({ branchId: selectedBranch })
      alert(`Initialized ${result.created} currency inventory records`)
    } catch (error) {
      console.error('Failed to initialize inventory:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Treasury Management</h1>
          <p className="text-dark-400 mt-1">Manage currency inventory and vault balances</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value as Id<'branches'> | '')}
            className="input w-48"
          >
            <option value="">All Branches</option>
            {activeBranches.map((branch) => (
              <option key={branch._id} value={branch._id}>
                {branch.name}
              </option>
            ))}
          </select>
          {selectedBranch && (
            <button
              onClick={handleInitializeInventory}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Initialize Inventory
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Currencies</p>
              <p className="text-2xl font-bold text-dark-50">{inventory?.length || 0}</p>
            </div>
            <div className="h-10 w-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-500" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-red-400">{lowAlerts?.length || 0}</p>
            </div>
            <div className="h-10 w-10 bg-red-600/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Recent Movements</p>
              <p className="text-2xl font-bold text-dark-50">{movements?.length || 0}</p>
            </div>
            <div className="h-10 w-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <History className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Active Branches</p>
              <p className="text-2xl font-bold text-dark-50">{activeBranches.length}</p>
            </div>
            <div className="h-10 w-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-dark-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-600/20 text-red-400">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && (
        <InventoryTab
          inventory={inventory || []}
          selectedBranch={selectedBranch}
          onAdjust={(currency) => {
            setSelectedCurrency(currency)
            setShowAdjustModal(true)
          }}
          onSetThreshold={(currency) => {
            setSelectedCurrency(currency)
            setShowThresholdModal(true)
          }}
        />
      )}

      {activeTab === 'movements' && (
        <MovementsTab movements={movements || []} />
      )}

      {activeTab === 'wholesale' && (
        <WholesaleTab
          selectedBranch={selectedBranch}
          onWholesaleBuy={() => {
            setWholesaleType('buy')
            setShowWholesaleModal(true)
          }}
          onWholesaleSell={() => {
            setWholesaleType('sell')
            setShowWholesaleModal(true)
          }}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsTab alerts={lowAlerts || []} />
      )}

      {/* Adjust Modal */}
      {showAdjustModal && selectedBranch && (
        <AdjustModal
          branchId={selectedBranch}
          currencyCode={selectedCurrency}
          currencies={activeCurrencies}
          onClose={() => {
            setShowAdjustModal(false)
            setSelectedCurrency('')
          }}
          onSubmit={adjustInventory}
        />
      )}

      {/* Threshold Modal */}
      {showThresholdModal && selectedBranch && (
        <ThresholdModal
          branchId={selectedBranch}
          currencyCode={selectedCurrency}
          currencies={activeCurrencies}
          inventory={inventory || []}
          onClose={() => {
            setShowThresholdModal(false)
            setSelectedCurrency('')
          }}
          onSubmit={setThresholds}
        />
      )}

      {/* Wholesale Modal */}
      {showWholesaleModal && selectedBranch && (
        <WholesaleModal
          branchId={selectedBranch}
          type={wholesaleType}
          currencies={activeCurrencies}
          onClose={() => setShowWholesaleModal(false)}
          onSubmit={wholesaleType === 'buy' ? recordWholesaleBuy : recordWholesaleSell}
        />
      )}
    </div>
  )
}

interface InventoryItem {
  _id: Id<'currencyInventory'>
  branchId: Id<'branches'>
  currencyCode: string
  balance: number
  lowThreshold?: number
  highThreshold?: number
  currencyName: string
  currencySymbol: string
  branchName: string
  isLow: boolean
  isHigh: boolean
}

function InventoryTab({
  inventory,
  selectedBranch,
  onAdjust,
  onSetThreshold,
}: {
  inventory: InventoryItem[]
  selectedBranch: string
  onAdjust: (currency: string) => void
  onSetThreshold: (currency: string) => void
}) {
  if (!selectedBranch) {
    return (
      <div className="card p-8 text-center">
        <Vault className="h-12 w-12 text-dark-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-dark-200 mb-2">Select a Branch</h3>
        <p className="text-dark-400">Please select a branch to view and manage currency inventory.</p>
      </div>
    )
  }

  if (inventory.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Package className="h-12 w-12 text-dark-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-dark-200 mb-2">No Inventory Records</h3>
        <p className="text-dark-400 mb-4">Click "Initialize Inventory" to create inventory records for all active currencies.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-dark-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Currency</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Balance</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Low Threshold</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">High Threshold</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700">
          {inventory.map((item) => (
            <tr key={item._id} className="hover:bg-dark-800/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-dark-100">{item.currencyCode}</span>
                  <span className="text-dark-400 text-sm">{item.currencyName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`font-mono ${item.isLow ? 'text-red-400' : item.isHigh ? 'text-yellow-400' : 'text-dark-100'}`}>
                  {item.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-dark-400 font-mono">
                {item.lowThreshold?.toLocaleString() || '-'}
              </td>
              <td className="px-4 py-3 text-right text-dark-400 font-mono">
                {item.highThreshold?.toLocaleString() || '-'}
              </td>
              <td className="px-4 py-3 text-center">
                {item.isLow ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-600/20 text-red-400">
                    <TrendingDown className="h-3 w-3" /> Low
                  </span>
                ) : item.isHigh ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-600/20 text-yellow-400">
                    <TrendingUp className="h-3 w-3" /> High
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-600/20 text-green-400">
                    Normal
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onAdjust(item.currencyCode)}
                    className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200"
                    title="Adjust Balance"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onSetThreshold(item.currencyCode)}
                    className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200"
                    title="Set Thresholds"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface Movement {
  _id: Id<'inventoryMovements'>
  branchId: Id<'branches'>
  currencyCode: string
  movementType: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  notes?: string
  createdAt: number
  createdByName: string
  branchName: string
}

function MovementsTab({ movements }: { movements: Movement[] }) {
  const getMovementBadge = (type: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      adjustment: { color: 'bg-blue-600/20 text-blue-400', label: 'Adjustment' },
      transaction: { color: 'bg-green-600/20 text-green-400', label: 'Transaction' },
      wholesale_buy: { color: 'bg-purple-600/20 text-purple-400', label: 'Wholesale Buy' },
      wholesale_sell: { color: 'bg-orange-600/20 text-orange-400', label: 'Wholesale Sell' },
      transfer: { color: 'bg-yellow-600/20 text-yellow-400', label: 'Transfer' },
    }
    return badges[type] || { color: 'bg-dark-600/20 text-dark-400', label: type }
  }

  if (movements.length === 0) {
    return (
      <div className="card p-8 text-center">
        <History className="h-12 w-12 text-dark-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-dark-200 mb-2">No Movement History</h3>
        <p className="text-dark-400">Inventory movements will appear here once transactions or adjustments are made.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-dark-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Date/Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Currency</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Branch</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Balance After</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Notes</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">User</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700">
          {movements.map((mov) => {
            const badge = getMovementBadge(mov.movementType)
            return (
              <tr key={mov._id} className="hover:bg-dark-800/30">
                <td className="px-4 py-3 text-dark-300 text-sm">
                  {new Date(mov.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-dark-100">{mov.currencyCode}</td>
                <td className="px-4 py-3 text-dark-300">{mov.branchName}</td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={mov.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {mov.amount >= 0 ? '+' : ''}{mov.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-dark-100">
                  {mov.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-dark-400 text-sm max-w-xs truncate">
                  {mov.notes || '-'}
                </td>
                <td className="px-4 py-3 text-dark-300 text-sm">{mov.createdByName}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WholesaleTab({
  selectedBranch,
  onWholesaleBuy,
  onWholesaleSell,
}: {
  selectedBranch: string
  onWholesaleBuy: () => void
  onWholesaleSell: () => void
}) {
  if (!selectedBranch) {
    return (
      <div className="card p-8 text-center">
        <ArrowUpDown className="h-12 w-12 text-dark-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-dark-200 mb-2">Select a Branch</h3>
        <p className="text-dark-400">Please select a branch to record wholesale operations.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 bg-green-600/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-dark-100">Wholesale Buy</h3>
            <p className="text-dark-400 text-sm">Purchase currency from suppliers</p>
          </div>
        </div>
        <p className="text-dark-300 text-sm mb-4">
          Record currency purchases from wholesale suppliers or banks. This increases your inventory balance.
        </p>
        <button onClick={onWholesaleBuy} className="btn btn-primary w-full flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" />
          Record Wholesale Buy
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-dark-100">Wholesale Sell</h3>
            <p className="text-dark-400 text-sm">Sell currency to other dealers</p>
          </div>
        </div>
        <p className="text-dark-300 text-sm mb-4">
          Record currency sales to other exchange bureaus or banks. This decreases your inventory balance.
        </p>
        <button onClick={onWholesaleSell} className="btn btn-secondary w-full flex items-center justify-center gap-2">
          <Minus className="h-4 w-4" />
          Record Wholesale Sell
        </button>
      </div>
    </div>
  )
}

interface Alert {
  _id: Id<'currencyInventory'>
  currencyCode: string
  balance: number
  lowThreshold?: number
  currencyName: string
  branchName: string
  shortfall: number
}

function AlertsTab({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-dark-200 mb-2">No Low Inventory Alerts</h3>
        <p className="text-dark-400">All currency inventory levels are within acceptable thresholds.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div key={alert._id} className="card p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h4 className="font-medium text-dark-100">
                  Low {alert.currencyCode} Inventory at {alert.branchName}
                </h4>
                <p className="text-dark-400 text-sm">
                  Current balance: {alert.balance.toLocaleString()} | Threshold: {alert.lowThreshold?.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-red-400 font-medium">
                Shortfall: {alert.shortfall.toLocaleString()}
              </p>
              <p className="text-dark-500 text-sm">{alert.currencyName}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface Currency {
  _id: Id<'currencies'>
  code: string
  name: string
}

function AdjustModal({
  branchId,
  currencyCode,
  currencies,
  onClose,
  onSubmit,
}: {
  branchId: Id<'branches'>
  currencyCode: string
  currencies: Currency[]
  onClose: () => void
  onSubmit: (args: { branchId: Id<'branches'>; currencyCode: string; adjustmentAmount: number; notes?: string }) => Promise<{ success: boolean; newBalance: number }>
}) {
  const [selectedCurrency, setSelectedCurrency] = useState(currencyCode)
  const [amount, setAmount] = useState('')
  const [isPositive, setIsPositive] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCurrency || !amount) return

    setSubmitting(true)
    try {
      const adjustmentAmount = isPositive ? parseFloat(amount) : -parseFloat(amount)
      await onSubmit({
        branchId,
        currencyCode: selectedCurrency,
        adjustmentAmount,
        notes: notes || undefined,
      })
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to adjust inventory')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-dark-950/80 flex items-center justify-center z-50">
      <div className="bg-dark-900 rounded-xl border border-dark-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-50">Adjust Inventory</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Currency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select Currency</option>
              {currencies.map((c) => (
                <option key={c._id} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Adjustment Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPositive(true)}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  isPositive
                    ? 'bg-green-600/20 border-green-600 text-green-400'
                    : 'border-dark-600 text-dark-400 hover:bg-dark-800'
                }`}
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsPositive(false)}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  !isPositive
                    ? 'bg-red-600/20 border-red-600 text-red-400'
                    : 'border-dark-600 text-dark-400 hover:bg-dark-800'
                }`}
              >
                <Minus className="h-4 w-4 inline mr-2" />
                Remove
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input w-full"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              rows={2}
              placeholder="Reason for adjustment..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? 'Adjusting...' : 'Adjust'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ThresholdModal({
  branchId,
  currencyCode,
  currencies,
  inventory,
  onClose,
  onSubmit,
}: {
  branchId: Id<'branches'>
  currencyCode: string
  currencies: Currency[]
  inventory: InventoryItem[]
  onClose: () => void
  onSubmit: (args: { branchId: Id<'branches'>; currencyCode: string; lowThreshold?: number; highThreshold?: number }) => Promise<{ success: boolean }>
}) {
  const existingItem = inventory.find((i) => i.currencyCode === currencyCode)
  const [selectedCurrency, setSelectedCurrency] = useState(currencyCode)
  const [lowThreshold, setLowThreshold] = useState(existingItem?.lowThreshold?.toString() || '')
  const [highThreshold, setHighThreshold] = useState(existingItem?.highThreshold?.toString() || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCurrency) return

    setSubmitting(true)
    try {
      await onSubmit({
        branchId,
        currencyCode: selectedCurrency,
        lowThreshold: lowThreshold ? parseFloat(lowThreshold) : undefined,
        highThreshold: highThreshold ? parseFloat(highThreshold) : undefined,
      })
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to set thresholds')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-dark-950/80 flex items-center justify-center z-50">
      <div className="bg-dark-900 rounded-xl border border-dark-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-50">Set Thresholds</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Currency</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select Currency</option>
              {currencies.map((c) => (
                <option key={c._id} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Low Threshold</label>
            <input
              type="number"
              value={lowThreshold}
              onChange={(e) => setLowThreshold(e.target.value)}
              className="input w-full"
              placeholder="Alert when below this amount"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-dark-500 mt-1">Trigger alert when inventory falls below this level</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">High Threshold</label>
            <input
              type="number"
              value={highThreshold}
              onChange={(e) => setHighThreshold(e.target.value)}
              className="input w-full"
              placeholder="Alert when above this amount"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-dark-500 mt-1">Trigger alert when inventory exceeds this level</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? 'Saving...' : 'Save Thresholds'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WholesaleModal({
  branchId,
  type,
  currencies,
  onClose,
  onSubmit,
}: {
  branchId: Id<'branches'>
  type: 'buy' | 'sell'
  currencies: Currency[]
  onClose: () => void
  onSubmit: (args: { branchId: Id<'branches'>; currencyCode: string; amount: number; supplier?: string; buyer?: string; notes?: string }) => Promise<{ success: boolean; newBalance: number }>
}) {
  const [currencyCode, setCurrencyCode] = useState('')
  const [amount, setAmount] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currencyCode || !amount) return

    setSubmitting(true)
    try {
      await onSubmit({
        branchId,
        currencyCode,
        amount: parseFloat(amount),
        ...(type === 'buy' ? { supplier: counterparty || undefined } : { buyer: counterparty || undefined }),
        notes: notes || undefined,
      })
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to record wholesale ${type}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-dark-950/80 flex items-center justify-center z-50">
      <div className="bg-dark-900 rounded-xl border border-dark-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-50">
            Wholesale {type === 'buy' ? 'Buy' : 'Sell'}
          </h3>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Currency</label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="input w-full"
              required
            >
              <option value="">Select Currency</option>
              {currencies.map((c) => (
                <option key={c._id} value={c.code}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input w-full"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              {type === 'buy' ? 'Supplier' : 'Buyer'} (optional)
            </label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className="input w-full"
              placeholder={type === 'buy' ? 'Bank or supplier name' : 'Dealer or buyer name'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              rows={2}
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? 'Recording...' : `Record ${type === 'buy' ? 'Buy' : 'Sell'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
