import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  BookOpen,
  FileText,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  Filter,
  X,
  Printer,
} from "lucide-react"
import clsx from "clsx"

type Tab = "reconciliation" | "profitloss" | "journal" | "ratehistory"

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  CAD: "C$",
  AUD: "A$",
  JPY: "\u00A5",
  CHF: "Fr",
  MXN: "Mex$",
}

export function AccountingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("reconciliation")
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedCurrency, setSelectedCurrency] = useState("")
  const [selectedEntryId, setSelectedEntryId] = useState<Id<"journalEntries"> | null>(null)

  const branches = useQuery(api.branches.list)
  const [selectedBranchId, setSelectedBranchId] = useState<Id<"branches"> | undefined>(undefined)

  const selectedDateTimestamp = selectedDate ? new Date(selectedDate).getTime() : Date.now()

  const reconciliation = useQuery(api.accounting.getDailyReconciliation, {
    date: selectedDateTimestamp,
    branchId: selectedBranchId,
  })

  const profitLoss = useQuery(api.accounting.getProfitLossByCurrency, {
    dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
    dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
    branchId: selectedBranchId,
  })

  const journalEntries = useQuery(api.accounting.getJournalEntries, {
    dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
    dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
    limit: 50,
  })

  const journalEntryDetail = useQuery(
    api.accounting.getJournalEntryWithLines,
    selectedEntryId ? { id: selectedEntryId } : "skip"
  )

  const rateHistory = useQuery(api.accounting.getRateHistory, {
    targetCurrency: selectedCurrency || undefined,
    limit: 50,
  })

  const currencies = useQuery(api.currencies.getActive)

  const generateAllEntries = useMutation(api.accounting.generateAllJournalEntries)
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null)

  const handleGenerateEntries = async () => {
    setGenerating(true)
    setGenerateResult(null)
    const result = await generateAllEntries({})
    setGenerateResult(result)
    setGenerating(false)
  }

  const exportToCSV = (data: unknown[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0] as Record<string, unknown>)
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = (row as Record<string, unknown>)[h]
            if (typeof val === "string" && val.includes(",")) {
              return `"${val}"`
            }
            return val
          })
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const tabs = [
    { id: "reconciliation" as Tab, name: "Daily Reconciliation", icon: Calendar },
    { id: "profitloss" as Tab, name: "Profit/Loss", icon: TrendingUp },
    { id: "journal" as Tab, name: "Journal Entries", icon: BookOpen },
    { id: "ratehistory" as Tab, name: "Rate History", icon: Clock },
  ]

  const formatCurrency = (amount: number, currency = "USD") => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Accounting</h1>
          <p className="text-dark-400 mt-1">Financial reports, reconciliation, and journal entries</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedBranchId || ""}
            onChange={(e) => setSelectedBranchId(e.target.value as Id<"branches"> | undefined || undefined)}
            className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Branches</option>
            {branches?.map((branch) => (
              <option key={branch._id} value={branch._id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-b border-dark-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary-500 text-primary-400"
                  : "border-transparent text-dark-400 hover:text-dark-200"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg text-sm transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={() => {
                  if (reconciliation?.transactions) {
                    exportToCSV(reconciliation.transactions, `reconciliation-${selectedDate}`)
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {reconciliation && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Transactions</span>
                    <FileText className="h-5 w-5 text-primary-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-dark-50">
                    {reconciliation.transactionCount}
                  </div>
                  <div className="text-xs text-dark-500 mt-1">
                    {reconciliation.voidedCount} voided
                  </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Total Buy</span>
                    <ArrowDownRight className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-green-400">
                    {formatCurrency(reconciliation.totalBuyAmount)}
                  </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Total Sell</span>
                    <ArrowUpRight className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-400">
                    {formatCurrency(reconciliation.totalSellAmount)}
                  </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Net Position</span>
                    <DollarSign className="h-5 w-5 text-primary-500" />
                  </div>
                  <div
                    className={clsx(
                      "mt-2 text-2xl font-bold",
                      reconciliation.netAmount >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {formatCurrency(reconciliation.netAmount)}
                  </div>
                </div>
              </div>

              <div className="bg-dark-800/50 border border-dark-700 rounded-lg">
                <div className="px-4 py-3 border-b border-dark-700">
                  <h3 className="font-medium text-dark-200">Currency Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-dark-400 text-sm border-b border-dark-700">
                        <th className="text-left px-4 py-3 font-medium">Currency</th>
                        <th className="text-right px-4 py-3 font-medium">Buy Count</th>
                        <th className="text-right px-4 py-3 font-medium">Buy Volume</th>
                        <th className="text-right px-4 py-3 font-medium">Sell Count</th>
                        <th className="text-right px-4 py-3 font-medium">Sell Volume</th>
                        <th className="text-right px-4 py-3 font-medium">Net Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reconciliation.currencyBreakdown).map(
                        ([currency, data]) => (
                          <tr key={currency} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                            <td className="px-4 py-3 font-medium text-dark-200">{currency}</td>
                            <td className="text-right px-4 py-3 text-dark-300">{data.buyCount}</td>
                            <td className="text-right px-4 py-3 text-green-400">
                              {formatCurrency(data.bought, currency)}
                            </td>
                            <td className="text-right px-4 py-3 text-dark-300">{data.sellCount}</td>
                            <td className="text-right px-4 py-3 text-red-400">
                              {formatCurrency(data.sold, currency)}
                            </td>
                            <td
                              className={clsx(
                                "text-right px-4 py-3 font-medium",
                                data.bought - data.sold >= 0 ? "text-green-400" : "text-red-400"
                              )}
                            >
                              {formatCurrency(data.bought - data.sold, currency)}
                            </td>
                          </tr>
                        )
                      )}
                      {Object.keys(reconciliation.currencyBreakdown).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-dark-400">
                            No transactions for this date
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-dark-800/50 border border-dark-700 rounded-lg">
                <div className="px-4 py-3 border-b border-dark-700">
                  <h3 className="font-medium text-dark-200">Transaction List</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-dark-800">
                      <tr className="text-dark-400 text-sm border-b border-dark-700">
                        <th className="text-left px-4 py-3 font-medium">Time</th>
                        <th className="text-left px-4 py-3 font-medium">Transaction #</th>
                        <th className="text-left px-4 py-3 font-medium">Type</th>
                        <th className="text-right px-4 py-3 font-medium">From</th>
                        <th className="text-right px-4 py-3 font-medium">To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.transactions.map((t) => (
                        <tr key={t._id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                          <td className="px-4 py-2 text-dark-400 text-sm">
                            {new Date(t.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2 font-mono text-sm text-dark-300">
                            {t.transactionNumber}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={clsx(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                t.type === "buy"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              )}
                            >
                              {t.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-right px-4 py-2 text-dark-300">
                            {t.sourceAmount.toFixed(2)} {t.sourceCurrency}
                          </td>
                          <td className="text-right px-4 py-2 text-dark-300">
                            {t.targetAmount.toFixed(2)} {t.targetCurrency}
                          </td>
                        </tr>
                      ))}
                      {reconciliation.transactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-dark-400">
                            No transactions for this date
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "profitloss" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-dark-400 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="mt-5 flex items-center gap-1 px-3 py-2 text-dark-400 hover:text-dark-200 text-sm"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={() => {
                if (profitLoss) {
                  exportToCSV(profitLoss, `profit-loss-${dateFrom || "all"}-${dateTo || "all"}`)
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {profitLoss && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Total Buy Volume</span>
                    <ArrowDownRight className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-dark-50">
                    {profitLoss.reduce((sum, p) => sum + p.buyVolume, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-dark-500 mt-1">
                    {profitLoss.reduce((sum, p) => sum + p.buyCount, 0)} transactions
                  </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Total Sell Volume</span>
                    <ArrowUpRight className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-dark-50">
                    {profitLoss.reduce((sum, p) => sum + p.sellVolume, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-dark-500 mt-1">
                    {profitLoss.reduce((sum, p) => sum + p.sellCount, 0)} transactions
                  </div>
                </div>
                <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400 text-sm">Estimated P&L</span>
                    <TrendingUp className="h-5 w-5 text-primary-500" />
                  </div>
                  <div
                    className={clsx(
                      "mt-2 text-2xl font-bold",
                      profitLoss.reduce((sum, p) => sum + p.estimatedProfit, 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    )}
                  >
                    {formatCurrency(profitLoss.reduce((sum, p) => sum + p.estimatedProfit, 0))}
                  </div>
                  <div className="text-xs text-dark-500 mt-1">Based on spread</div>
                </div>
              </div>

              <div className="bg-dark-800/50 border border-dark-700 rounded-lg">
                <div className="px-4 py-3 border-b border-dark-700">
                  <h3 className="font-medium text-dark-200">Profit/Loss by Currency</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-dark-400 text-sm border-b border-dark-700">
                        <th className="text-left px-4 py-3 font-medium">Currency</th>
                        <th className="text-right px-4 py-3 font-medium">Buy Volume</th>
                        <th className="text-right px-4 py-3 font-medium">Buy Count</th>
                        <th className="text-right px-4 py-3 font-medium">Sell Volume</th>
                        <th className="text-right px-4 py-3 font-medium">Sell Count</th>
                        <th className="text-right px-4 py-3 font-medium">Est. Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitLoss.map((p) => (
                        <tr key={p.currency} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                          <td className="px-4 py-3 font-medium text-dark-200">{p.currency}</td>
                          <td className="text-right px-4 py-3 text-green-400">
                            {p.buyVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right px-4 py-3 text-dark-400">{p.buyCount}</td>
                          <td className="text-right px-4 py-3 text-red-400">
                            {p.sellVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="text-right px-4 py-3 text-dark-400">{p.sellCount}</td>
                          <td
                            className={clsx(
                              "text-right px-4 py-3 font-medium",
                              p.estimatedProfit >= 0 ? "text-green-400" : "text-red-400"
                            )}
                          >
                            {formatCurrency(p.estimatedProfit)}
                          </td>
                        </tr>
                      ))}
                      {profitLoss.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-dark-400">
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "journal" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-dark-400 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateEntries}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={clsx("h-4 w-4", generating && "animate-spin")} />
                Generate from Transactions
              </button>
              <button
                onClick={() => {
                  if (journalEntries) {
                    exportToCSV(
                      journalEntries.map((e) => ({
                        entryNumber: e.entryNumber,
                        date: formatDate(e.entryDate),
                        description: e.description,
                        status: e.status,
                        reference: e.referenceType || "",
                      })),
                      "journal-entries"
                    )
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {generateResult && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
              Generated {generateResult.created} journal entries ({generateResult.skipped} skipped - already exist or missing cash accounts)
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-dark-800/50 border border-dark-700 rounded-lg">
              <div className="px-4 py-3 border-b border-dark-700">
                <h3 className="font-medium text-dark-200">Journal Entries</h3>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-dark-800">
                    <tr className="text-dark-400 text-sm border-b border-dark-700">
                      <th className="text-left px-4 py-3 font-medium">Entry #</th>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">Description</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalEntries?.map((entry) => (
                      <tr
                        key={entry._id}
                        onClick={() => setSelectedEntryId(entry._id)}
                        className={clsx(
                          "border-b border-dark-700/50 cursor-pointer transition-colors",
                          selectedEntryId === entry._id
                            ? "bg-primary-600/10"
                            : "hover:bg-dark-700/30"
                        )}
                      >
                        <td className="px-4 py-2 font-mono text-sm text-dark-300">
                          {entry.entryNumber}
                        </td>
                        <td className="px-4 py-2 text-dark-400 text-sm">
                          {formatDate(entry.entryDate)}
                        </td>
                        <td className="px-4 py-2 text-dark-300 text-sm max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              entry.status === "posted"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            )}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="text-right px-4 py-2">
                          <ChevronRight className="h-4 w-4 text-dark-500" />
                        </td>
                      </tr>
                    ))}
                    {(!journalEntries || journalEntries.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-dark-400">
                          No journal entries found. Click "Generate from Transactions" to create entries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-dark-800/50 border border-dark-700 rounded-lg">
              <div className="px-4 py-3 border-b border-dark-700">
                <h3 className="font-medium text-dark-200">Entry Details</h3>
              </div>
              {journalEntryDetail ? (
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-xs text-dark-400">Entry Number</div>
                    <div className="font-mono text-dark-200">{journalEntryDetail.entryNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-dark-400">Date</div>
                    <div className="text-dark-200">{formatDateTime(journalEntryDetail.entryDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-dark-400">Description</div>
                    <div className="text-dark-200 text-sm">{journalEntryDetail.description}</div>
                  </div>
                  {journalEntryDetail.referenceType && (
                    <div>
                      <div className="text-xs text-dark-400">Reference</div>
                      <div className="text-dark-200 text-sm capitalize">
                        {journalEntryDetail.referenceType}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 border-t border-dark-700">
                    <div className="text-xs text-dark-400 mb-2">Lines</div>
                    <div className="space-y-2">
                      {journalEntryDetail.lines.map((line, i) => (
                        <div
                          key={i}
                          className="bg-dark-900/50 rounded p-2 text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-dark-300">
                              {line.account?.accountName || "Unknown Account"}
                            </div>
                            <div className="text-right">
                              {line.debit > 0 && (
                                <div className="text-green-400">DR {line.debit.toFixed(2)}</div>
                              )}
                              {line.credit > 0 && (
                                <div className="text-red-400">CR {line.credit.toFixed(2)}</div>
                              )}
                            </div>
                          </div>
                          {line.description && (
                            <div className="text-xs text-dark-500 mt-1">{line.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-dark-400 text-sm">
                  Select an entry to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ratehistory" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Currency</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="bg-dark-800 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All Currencies</option>
                  {currencies?.map((c) => (
                    <option key={c._id} value={c.alias || c.code}>
                      {c.alias || c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                if (rateHistory) {
                  exportToCSV(
                    rateHistory.map((r) => ({
                      date: formatDateTime(r.effectiveFrom),
                      base: r.baseCurrency,
                      target: r.targetCurrency,
                      buyRate: r.buyRate,
                      sellRate: r.sellRate,
                      midRate: r.midRate,
                      spread: r.spread,
                      source: r.source,
                    })),
                    `rate-history-${selectedCurrency || "all"}`
                  )
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <div className="bg-dark-800/50 border border-dark-700 rounded-lg">
            <div className="px-4 py-3 border-b border-dark-700">
              <h3 className="font-medium text-dark-200">Rate History</h3>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-dark-800">
                  <tr className="text-dark-400 text-sm border-b border-dark-700">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Pair</th>
                    <th className="text-right px-4 py-3 font-medium">Buy Rate</th>
                    <th className="text-right px-4 py-3 font-medium">Sell Rate</th>
                    <th className="text-right px-4 py-3 font-medium">Mid Rate</th>
                    <th className="text-right px-4 py-3 font-medium">Spread %</th>
                    <th className="text-left px-4 py-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rateHistory?.map((rate) => (
                    <tr key={rate._id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                      <td className="px-4 py-2 text-dark-400 text-sm">
                        {formatDateTime(rate.effectiveFrom)}
                      </td>
                      <td className="px-4 py-2 text-dark-200 font-medium">
                        {rate.baseCurrency}/{rate.targetCurrency}
                      </td>
                      <td className="text-right px-4 py-2 text-green-400 font-mono">
                        {rate.buyRate.toFixed(4)}
                      </td>
                      <td className="text-right px-4 py-2 text-red-400 font-mono">
                        {rate.sellRate.toFixed(4)}
                      </td>
                      <td className="text-right px-4 py-2 text-dark-300 font-mono">
                        {rate.midRate.toFixed(4)}
                      </td>
                      <td className="text-right px-4 py-2 text-dark-400">
                        {(rate.spread * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            rate.source === "api"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-gray-500/20 text-gray-400"
                          )}
                        >
                          {rate.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!rateHistory || rateHistory.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-dark-400">
                        No rate history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
