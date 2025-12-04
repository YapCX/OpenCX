import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  Search,
  Filter,
  Calendar,
  X,
  ArrowRightLeft,
  User,
  Clock,
  Hash,
  DollarSign,
  ChevronRight,
  Ban,
  Eye,
} from "lucide-react"
import clsx from "clsx"

interface Transaction {
  _id: Id<"transactions">
  transactionNumber: string
  transactionType: string
  sourceCurrency: string
  targetCurrency: string
  sourceAmount: number
  targetAmount: number
  totalAmount: number
  exchangeRate: number
  status: string
  createdAt: number
  customerId?: Id<"customers">
  voidReason?: string
}

interface TransactionWithDetails extends Transaction {
  customer?: {
    firstName: string
    lastName: string
    email?: string
  } | null
  branch?: {
    name: string
    code: string
  } | null
}

export function TransactionsPage() {
  const [search, setSearch] = useState("")
  const [transactionType, setTransactionType] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [currency, setCurrency] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selectedTransaction, setSelectedTransaction] = useState<Id<"transactions"> | null>(null)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState("")

  const dateFromMs = dateFrom ? new Date(dateFrom).getTime() : undefined
  const dateToMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : undefined

  const transactions = useQuery(api.transactions.listWithFilters, {
    search: search || undefined,
    transactionType: transactionType || undefined,
    status: status || undefined,
    currency: currency || undefined,
    dateFrom: dateFromMs,
    dateTo: dateToMs,
  }) as Transaction[] | undefined

  const transactionDetails = useQuery(
    api.transactions.getWithCustomer,
    selectedTransaction ? { id: selectedTransaction } : "skip"
  ) as TransactionWithDetails | null | undefined

  const currencies = useQuery(api.currencies.getActive)
  const voidTransaction = useMutation(api.transactions.voidTransaction)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " " + currencyCode
  }

  const clearFilters = () => {
    setSearch("")
    setTransactionType("")
    setStatus("")
    setCurrency("")
    setDateFrom("")
    setDateTo("")
  }

  const hasFilters = search || transactionType || status || currency || dateFrom || dateTo

  const handleVoid = async () => {
    if (!selectedTransaction || !voidReason) return
    await voidTransaction({ id: selectedTransaction, reason: voidReason })
    setShowVoidModal(false)
    setVoidReason("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Transactions</h1>
          <p className="text-dark-400">View and manage all currency exchange transactions</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-dark-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-dark-400">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by transaction #"
                className="input pl-10 py-1.5 text-sm w-48"
              />
            </div>

            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="input py-1.5 text-sm"
            >
              <option value="">All Types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input py-1.5 text-sm"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="voided">Voided</option>
            </select>

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input py-1.5 text-sm"
            >
              <option value="">All Currencies</option>
              {currencies?.map((c) => (
                <option key={c._id} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-dark-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input text-sm py-1.5"
              />
              <span className="text-dark-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input text-sm py-1.5"
              />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-dark-400 hover:text-dark-200 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-800/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Transaction #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">From</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">To</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Rate</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!transactions || transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-400">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No transactions found</p>
                    <p className="text-sm mt-1">Transactions will appear here once recorded.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr
                    key={txn._id}
                    className={clsx(
                      "border-b border-dark-700 hover:bg-dark-800/30 cursor-pointer transition-colors",
                      selectedTransaction === txn._id && "bg-dark-800/50"
                    )}
                    onClick={() => setSelectedTransaction(txn._id)}
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm text-dark-200">{formatDate(txn.createdAt)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono text-dark-200">{txn.transactionNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          "text-xs px-2 py-0.5 rounded font-medium",
                          txn.transactionType === "buy"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-blue-900/50 text-blue-400"
                        )}
                      >
                        {txn.transactionType.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-dark-200">
                        {formatCurrency(txn.sourceAmount, txn.sourceCurrency)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-dark-200">
                        {formatCurrency(txn.targetAmount, txn.targetCurrency)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-dark-300">{txn.exchangeRate.toFixed(4)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          "text-xs px-2 py-0.5 rounded",
                          txn.status === "completed"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-red-900/50 text-red-400"
                        )}
                      >
                        {txn.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTransaction(txn._id)
                        }}
                        className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {transactions && transactions.length > 0 && (
          <div className="p-4 border-t border-dark-700 text-sm text-dark-400">
            Showing {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {selectedTransaction && transactionDetails && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-lg border border-dark-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-900">
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="h-5 w-5 text-primary-400" />
                <div>
                  <h3 className="text-lg font-semibold text-dark-50">Transaction Details</h3>
                  <p className="text-sm text-dark-400 font-mono">{transactionDetails.transactionNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 rounded-lg hover:bg-dark-800"
              >
                <X className="h-5 w-5 text-dark-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-dark-400 uppercase tracking-wide">Status</label>
                    <p className="mt-1">
                      <span
                        className={clsx(
                          "text-sm px-2 py-0.5 rounded",
                          transactionDetails.status === "completed"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-red-900/50 text-red-400"
                        )}
                      >
                        {transactionDetails.status.toUpperCase()}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-dark-400 uppercase tracking-wide">Type</label>
                    <p className="mt-1">
                      <span
                        className={clsx(
                          "text-sm px-2 py-0.5 rounded font-medium",
                          transactionDetails.transactionType === "buy"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-blue-900/50 text-blue-400"
                        )}
                      >
                        {transactionDetails.transactionType.toUpperCase()}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-dark-400 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Date & Time
                    </label>
                    <p className="text-dark-200 mt-1">{formatDateTime(transactionDetails.createdAt)}</p>
                  </div>

                  {transactionDetails.branch && (
                    <div>
                      <label className="text-xs text-dark-400 uppercase tracking-wide">Branch</label>
                      <p className="text-dark-200 mt-1">
                        {transactionDetails.branch.name} ({transactionDetails.branch.code})
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-dark-400 uppercase tracking-wide flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Customer
                    </label>
                    {transactionDetails.customer ? (
                      <p className="text-dark-200 mt-1">
                        {transactionDetails.customer.firstName} {transactionDetails.customer.lastName}
                        {transactionDetails.customer.email && (
                          <span className="text-dark-400 text-sm ml-2">({transactionDetails.customer.email})</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-dark-400 mt-1">Walk-in Customer</p>
                    )}
                  </div>

                  {transactionDetails.status === "voided" && transactionDetails.voidReason && (
                    <div>
                      <label className="text-xs text-red-400 uppercase tracking-wide">Void Reason</label>
                      <p className="text-red-400 mt-1">{transactionDetails.voidReason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-dark-700 pt-6">
                <h4 className="text-sm font-medium text-dark-300 mb-4">Exchange Details</h4>
                <div className="bg-dark-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-center">
                      <p className="text-xs text-dark-400 mb-1">From</p>
                      <p className="text-xl font-semibold text-dark-100">
                        {formatCurrency(transactionDetails.sourceAmount, transactionDetails.sourceCurrency)}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <ChevronRight className="h-6 w-6 text-dark-500" />
                      <p className="text-xs text-dark-400 mt-1">@ {transactionDetails.exchangeRate.toFixed(4)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-dark-400 mb-1">To</p>
                      <p className="text-xl font-semibold text-dark-100">
                        {formatCurrency(transactionDetails.targetAmount, transactionDetails.targetCurrency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-dark-700 flex justify-between">
                    <span className="text-dark-400">Total Amount</span>
                    <span className="text-dark-200 font-medium">
                      ${transactionDetails.totalAmount.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>

              {transactionDetails.status === "completed" && (
                <div className="flex justify-end pt-4 border-t border-dark-700">
                  <button
                    onClick={() => setShowVoidModal(true)}
                    className="btn-secondary text-red-400 border-red-700 hover:bg-red-900/30 flex items-center gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Void Transaction
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showVoidModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-lg border border-dark-700 w-full max-w-md">
            <div className="p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-50">Void Transaction</h3>
              <p className="text-sm text-dark-400 mt-1">This action cannot be undone.</p>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Reason for voiding
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter reason for voiding this transaction..."
                className="input w-full h-24 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => {
                  setShowVoidModal(false)
                  setVoidReason("")
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={!voidReason}
                className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Void Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
