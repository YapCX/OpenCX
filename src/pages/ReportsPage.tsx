import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  FileText,
  Download,
  Calendar,
  User,
  AlertTriangle,
  DollarSign,
  Filter,
  Clock,
  FileWarning,
  ChevronRight,
  X,
  Printer,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react"
import clsx from "clsx"

type TabType = "eod" | "ctr" | "sar"

interface CTRTransaction {
  _id: Id<"transactions">
  transactionNumber: string
  transactionType: string
  sourceCurrency: string
  targetCurrency: string
  sourceAmount: number
  targetAmount: number
  totalAmount: number
  createdAt: number
  customer?: {
    _id: Id<"customers">
    firstName: string
    lastName: string
    email?: string
  }
}

interface SARAlert {
  _id: Id<"complianceAlerts">
  alertType: string
  severity: string
  description: string
  status: string
  createdAt: number
  customer?: {
    _id: Id<"customers">
    firstName: string
    lastName: string
    email?: string
  }
  transaction?: {
    _id: Id<"transactions">
    transactionNumber: string
    totalAmount: number
  }
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("eod")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<"customers"> | null>(null)
  const [selectedAlertId, setSelectedAlertId] = useState<Id<"complianceAlerts"> | null>(null)
  const [showCTRPreview, setShowCTRPreview] = useState(false)
  const [showSARPreview, setShowSARPreview] = useState(false)
  const [eodDate, setEodDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })

  const dateFromMs = dateFrom ? new Date(dateFrom).getTime() : undefined
  const dateToMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : undefined
  const eodDateTimestamp = eodDate ? new Date(eodDate).getTime() : Date.now()

  const eodReport = useQuery(api.accounting.getDailyReconciliation, {
    date: eodDateTimestamp,
    branchId: undefined,
  })

  const ctrTransactions = useQuery(api.compliance.getCTRTransactions, {
    dateFrom: dateFromMs,
    dateTo: dateToMs,
    customerId: selectedCustomerId || undefined,
  }) as CTRTransaction[] | undefined

  const sarAlerts = useQuery(api.compliance.getSARAlerts, {
    dateFrom: dateFromMs,
    dateTo: dateToMs,
    status: "pending",
  }) as SARAlert[] | undefined

  const customers = useQuery(api.customers.list, { limit: 100 })

  const ctrReport = useQuery(
    api.compliance.generateCTRReport,
    selectedCustomerId && dateFromMs && dateToMs
      ? { customerId: selectedCustomerId, dateFrom: dateFromMs, dateTo: dateToMs }
      : "skip"
  )

  const sarReport = useQuery(
    api.compliance.generateSARReport,
    selectedAlertId ? { alertId: selectedAlertId } : "skip"
  )

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleGenerateCTR = (customerId: Id<"customers">) => {
    setSelectedCustomerId(customerId)
    setShowCTRPreview(true)
  }

  const handleGenerateSAR = (alertId: Id<"complianceAlerts">) => {
    setSelectedAlertId(alertId)
    setShowSARPreview(true)
  }

  const handlePrintReport = () => {
    window.print()
  }

  const handleDownloadReport = (reportType: string) => {
    const report = reportType === "CTR" ? ctrReport : sarReport
    if (!report) return

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${reportType}-Report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportEODReport = () => {
    if (!eodReport) return

    const csvContent = [
      `End of Day Report - ${eodDate}`,
      "",
      "Summary",
      `Total Transactions,${eodReport.transactionCount}`,
      `Voided Transactions,${eodReport.voidedCount}`,
      `Total Buy Amount,$${eodReport.totalBuyAmount.toFixed(2)}`,
      `Total Sell Amount,$${eodReport.totalSellAmount.toFixed(2)}`,
      `Net Position,$${eodReport.netAmount.toFixed(2)}`,
      "",
      "Currency Breakdown",
      "Currency,Buy Count,Buy Volume,Sell Count,Sell Volume,Net Volume",
      ...Object.entries(eodReport.currencyBreakdown).map(([currency, data]) =>
        `${currency},${data.buyCount},${data.bought.toFixed(2)},${data.sellCount},${data.sold.toFixed(2)},${(data.bought - data.sold).toFixed(2)}`
      ),
      "",
      "Transaction Details",
      "Time,Transaction #,Type,From,To",
      ...eodReport.transactions.map((t) =>
        `${new Date(t.createdAt).toLocaleTimeString()},${t.transactionNumber},${t.type},${t.sourceAmount.toFixed(2)} ${t.sourceCurrency},${t.targetAmount.toFixed(2)} ${t.targetCurrency}`
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `EOD-Report-${eodDate}.csv`
    link.click()
  }

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-900/50 text-red-400 border-red-700",
      high: "bg-orange-900/50 text-orange-400 border-orange-700",
      medium: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
      low: "bg-blue-900/50 text-blue-400 border-blue-700",
    }
    return colors[severity] || colors.low
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Compliance Reports</h1>
          <p className="text-dark-400">Generate CTR and SAR reports for regulatory compliance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-dark-700">
          <button
            onClick={() => setActiveTab("eod")}
            className={clsx(
              "px-6 py-3 text-sm font-medium transition-colors",
              activeTab === "eod"
                ? "text-primary-400 border-b-2 border-primary-500"
                : "text-dark-400 hover:text-dark-200"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              End of Day Report
            </div>
          </button>
          <button
            onClick={() => setActiveTab("ctr")}
            className={clsx(
              "px-6 py-3 text-sm font-medium transition-colors",
              activeTab === "ctr"
                ? "text-primary-400 border-b-2 border-primary-500"
                : "text-dark-400 hover:text-dark-200"
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CTR (Currency Transaction Report)
            </div>
          </button>
          <button
            onClick={() => setActiveTab("sar")}
            className={clsx(
              "px-6 py-3 text-sm font-medium transition-colors",
              activeTab === "sar"
                ? "text-primary-400 border-b-2 border-primary-500"
                : "text-dark-400 hover:text-dark-200"
            )}
          >
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              SAR (Suspicious Activity Report)
            </div>
          </button>
        </div>

        <div className="p-4">
          {/* Date Filters - only show for CTR/SAR tabs */}
          {activeTab !== "eod" && (
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-dark-400">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-dark-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input text-sm py-1.5"
                  placeholder="From Date"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-dark-400">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input text-sm py-1.5"
                />
              </div>

              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="text-sm text-dark-400 hover:text-dark-200 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear Dates
                </button>
              )}
            </div>
          )}

          {/* EOD Tab Content */}
          {activeTab === "eod" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">Report Date</label>
                    <input
                      type="date"
                      value={eodDate}
                      onChange={(e) => setEodDate(e.target.value)}
                      className="input text-sm py-1.5"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintReport}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    onClick={handleExportEODReport}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {eodReport && (
                <div className="space-y-6 print:text-black">
                  <div className="text-center border-b border-dark-700 pb-4 print:border-gray-300">
                    <h2 className="text-xl font-bold text-dark-50 print:text-black">END OF DAY REPORT</h2>
                    <p className="text-sm text-dark-400 print:text-gray-600">
                      {new Date(eodDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 print:bg-gray-100 print:border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400 text-sm print:text-gray-600">Transactions</span>
                        <FileText className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-dark-50 print:text-black">
                        {eodReport.transactionCount}
                      </div>
                      <div className="text-xs text-dark-500 print:text-gray-500 mt-1">
                        {eodReport.voidedCount} voided
                      </div>
                    </div>
                    <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 print:bg-gray-100 print:border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400 text-sm print:text-gray-600">Total Buy</span>
                        <ArrowDownRight className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-green-400 print:text-green-700">
                        {formatCurrency(eodReport.totalBuyAmount)}
                      </div>
                    </div>
                    <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 print:bg-gray-100 print:border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400 text-sm print:text-gray-600">Total Sell</span>
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-red-400 print:text-red-700">
                        {formatCurrency(eodReport.totalSellAmount)}
                      </div>
                    </div>
                    <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 print:bg-gray-100 print:border-gray-300">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400 text-sm print:text-gray-600">Net Position</span>
                        <DollarSign className="h-5 w-5 text-primary-500" />
                      </div>
                      <div
                        className={clsx(
                          "mt-2 text-2xl font-bold",
                          eodReport.netAmount >= 0 ? "text-green-400 print:text-green-700" : "text-red-400 print:text-red-700"
                        )}
                      >
                        {formatCurrency(eodReport.netAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 border border-dark-700 rounded-lg print:bg-white print:border-gray-300">
                    <div className="px-4 py-3 border-b border-dark-700 print:border-gray-300">
                      <h3 className="font-medium text-dark-200 print:text-black">Currency Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-dark-400 text-sm border-b border-dark-700 print:text-gray-600 print:border-gray-300">
                            <th className="text-left px-4 py-3 font-medium">Currency</th>
                            <th className="text-right px-4 py-3 font-medium">Buy Count</th>
                            <th className="text-right px-4 py-3 font-medium">Buy Volume</th>
                            <th className="text-right px-4 py-3 font-medium">Sell Count</th>
                            <th className="text-right px-4 py-3 font-medium">Sell Volume</th>
                            <th className="text-right px-4 py-3 font-medium">Net Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(eodReport.currencyBreakdown).map(([currency, data]) => (
                            <tr key={currency} className="border-b border-dark-700/50 hover:bg-dark-700/30 print:border-gray-200">
                              <td className="px-4 py-3 font-medium text-dark-200 print:text-black">{currency}</td>
                              <td className="text-right px-4 py-3 text-dark-300 print:text-gray-700">{data.buyCount}</td>
                              <td className="text-right px-4 py-3 text-green-400 print:text-green-700">
                                {data.bought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="text-right px-4 py-3 text-dark-300 print:text-gray-700">{data.sellCount}</td>
                              <td className="text-right px-4 py-3 text-red-400 print:text-red-700">
                                {data.sold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td
                                className={clsx(
                                  "text-right px-4 py-3 font-medium",
                                  data.bought - data.sold >= 0 ? "text-green-400 print:text-green-700" : "text-red-400 print:text-red-700"
                                )}
                              >
                                {(data.bought - data.sold).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          {Object.keys(eodReport.currencyBreakdown).length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-dark-400 print:text-gray-500">
                                No transactions for this date
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-dark-800/50 border border-dark-700 rounded-lg print:bg-white print:border-gray-300">
                    <div className="px-4 py-3 border-b border-dark-700 print:border-gray-300">
                      <h3 className="font-medium text-dark-200 print:text-black">Transaction Details</h3>
                    </div>
                    <div className="overflow-x-auto max-h-96 print:max-h-none">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-dark-800 print:bg-white">
                          <tr className="text-dark-400 text-sm border-b border-dark-700 print:text-gray-600 print:border-gray-300">
                            <th className="text-left px-4 py-3 font-medium">Time</th>
                            <th className="text-left px-4 py-3 font-medium">Transaction #</th>
                            <th className="text-left px-4 py-3 font-medium">Type</th>
                            <th className="text-right px-4 py-3 font-medium">From</th>
                            <th className="text-right px-4 py-3 font-medium">To</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eodReport.transactions.map((t) => (
                            <tr key={t._id} className="border-b border-dark-700/50 hover:bg-dark-700/30 print:border-gray-200">
                              <td className="px-4 py-2 text-dark-400 text-sm print:text-gray-600">
                                {new Date(t.createdAt).toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-2 font-mono text-sm text-dark-300 print:text-gray-700">
                                {t.transactionNumber}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={clsx(
                                    "px-2 py-0.5 rounded text-xs font-medium",
                                    t.type === "buy"
                                      ? "bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-700"
                                      : "bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-700"
                                  )}
                                >
                                  {t.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="text-right px-4 py-2 text-dark-300 print:text-gray-700">
                                {t.sourceAmount.toFixed(2)} {t.sourceCurrency}
                              </td>
                              <td className="text-right px-4 py-2 text-dark-300 print:text-gray-700">
                                {t.targetAmount.toFixed(2)} {t.targetCurrency}
                              </td>
                            </tr>
                          ))}
                          {eodReport.transactions.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-dark-400 print:text-gray-500">
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

          {/* CTR Tab Content */}
          {activeTab === "ctr" && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
                <DollarSign className="h-6 w-6 text-primary-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-dark-200">Currency Transaction Report (CTR)</h3>
                  <p className="text-sm text-dark-400 mt-1">
                    Required for cash transactions exceeding $10,000. The table below shows qualifying transactions.
                    Click "Generate CTR" to create a report for the selected customer.
                  </p>
                </div>
              </div>

              {/* CTR Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-800/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Transaction #</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!ctrTransactions || ctrTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-dark-400">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No CTR-eligible transactions found</p>
                          <p className="text-sm mt-1">Transactions over $10,000 will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      ctrTransactions.map((txn) => (
                        <tr key={txn._id} className="border-b border-dark-700 hover:bg-dark-800/30">
                          <td className="py-3 px-4">
                            <span className="text-sm text-dark-200">{formatDate(txn.createdAt)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-dark-200 font-mono">{txn.transactionNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            {txn.customer ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-dark-400" />
                                <span className="text-sm text-dark-200">
                                  {txn.customer.firstName} {txn.customer.lastName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-dark-500">Walk-in</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={clsx(
                              "text-xs px-2 py-0.5 rounded",
                              txn.transactionType === "buy"
                                ? "bg-green-900/50 text-green-400"
                                : "bg-blue-900/50 text-blue-400"
                            )}>
                              {txn.transactionType.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-dark-200">
                              {formatCurrency(txn.totalAmount)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {txn.customer && (
                              <button
                                onClick={() => handleGenerateCTR(txn.customer!._id)}
                                className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                              >
                                Generate CTR
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SAR Tab Content */}
          {activeTab === "sar" && (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-dark-800/50 rounded-lg border border-dark-700">
                <AlertTriangle className="h-6 w-6 text-orange-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-dark-200">Suspicious Activity Report (SAR)</h3>
                  <p className="text-sm text-dark-400 mt-1">
                    Required for suspicious transactions or activities. The table below shows flagged alerts
                    eligible for SAR filing. Click "Generate SAR" to create a report.
                  </p>
                </div>
              </div>

              {/* SAR Alerts Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-800/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Severity</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Subject</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!sarAlerts || sarAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-dark-400">
                          <FileWarning className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No SAR-eligible alerts found</p>
                          <p className="text-sm mt-1">High-severity and suspicious alerts will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      sarAlerts.map((alert) => (
                        <tr key={alert._id} className="border-b border-dark-700 hover:bg-dark-800/30">
                          <td className="py-3 px-4">
                            <span className="text-sm text-dark-200">{formatDate(alert.createdAt)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={clsx(
                              "text-xs px-2 py-0.5 rounded border",
                              getSeverityBadge(alert.severity)
                            )}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-dark-200">
                              {alert.alertType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {alert.customer ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-dark-400" />
                                <span className="text-sm text-dark-200">
                                  {alert.customer.firstName} {alert.customer.lastName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-dark-500">Unknown</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-dark-200 max-w-xs truncate">{alert.description}</p>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleGenerateSAR(alert._id)}
                              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                            >
                              Generate SAR
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTR Preview Modal */}
      {showCTRPreview && ctrReport && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-lg border border-dark-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-900">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary-400" />
                <div>
                  <h3 className="text-lg font-semibold text-dark-50">Currency Transaction Report (CTR)</h3>
                  <p className="text-sm text-dark-400">FinCEN Form 104 Equivalent</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => handleDownloadReport("CTR")}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowCTRPreview(false)
                    setSelectedCustomerId(null)
                  }}
                  className="p-2 rounded-lg hover:bg-dark-800"
                >
                  <X className="h-5 w-5 text-dark-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 print:bg-white print:text-black">
              {/* Report Header */}
              <div className="text-center border-b border-dark-700 pb-4 print:border-gray-300">
                <h2 className="text-xl font-bold text-dark-50 print:text-black">CURRENCY TRANSACTION REPORT</h2>
                <p className="text-sm text-dark-400 print:text-gray-600">
                  Generated: {formatDateTime(ctrReport.reportDate)}
                </p>
              </div>

              {/* Customer Information */}
              <div>
                <h4 className="text-sm font-medium text-primary-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Part I - Person(s) Involved in Transaction(s)
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Full Name</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.customer.firstName} {ctrReport.customer.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Date of Birth</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.customer.dateOfBirth || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Address</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.customer.address || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">ID Type / Number</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.customer.idType || "N/A"} - {ctrReport.customer.idNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Nationality</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.customer.nationality || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Occupation</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.customer.occupation || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Summary */}
              <div>
                <h4 className="text-sm font-medium text-primary-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Part II - Amount and Type of Transaction(s)
                </h4>
                <div className="grid grid-cols-4 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Total Transactions</label>
                    <p className="text-lg font-bold text-dark-50 print:text-black">
                      {ctrReport.summary.totalTransactions}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Total Amount</label>
                    <p className="text-lg font-bold text-dark-50 print:text-black">
                      {formatCurrency(ctrReport.summary.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Total Buy</label>
                    <p className="text-lg font-bold text-green-400 print:text-green-700">
                      {formatCurrency(ctrReport.summary.totalBuy)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Total Sell</label>
                    <p className="text-lg font-bold text-blue-400 print:text-blue-700">
                      {formatCurrency(ctrReport.summary.totalSell)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <label className="text-xs text-dark-400 print:text-gray-500">Currencies Involved</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ctrReport.summary.currenciesInvolved.map((currency: string) => (
                      <span
                        key={currency}
                        className="px-2 py-1 bg-dark-700 rounded text-sm text-dark-200 print:bg-gray-200 print:text-black"
                      >
                        {currency}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h4 className="text-sm font-medium text-primary-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Part III - Transaction Details
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-700 print:border-gray-300">
                        <th className="text-left py-2 px-3 text-dark-400 print:text-gray-600">Date</th>
                        <th className="text-left py-2 px-3 text-dark-400 print:text-gray-600">Txn #</th>
                        <th className="text-left py-2 px-3 text-dark-400 print:text-gray-600">Type</th>
                        <th className="text-left py-2 px-3 text-dark-400 print:text-gray-600">From</th>
                        <th className="text-left py-2 px-3 text-dark-400 print:text-gray-600">To</th>
                        <th className="text-right py-2 px-3 text-dark-400 print:text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ctrReport.transactions.map((txn: {
                        transactionNumber: string;
                        transactionType: string;
                        sourceCurrency: string;
                        targetCurrency: string;
                        sourceAmount: number;
                        targetAmount: number;
                        totalAmount: number;
                        date: number;
                      }, idx: number) => (
                        <tr key={idx} className="border-b border-dark-800 print:border-gray-200">
                          <td className="py-2 px-3 text-dark-200 print:text-black">
                            {formatDate(txn.date)}
                          </td>
                          <td className="py-2 px-3 font-mono text-dark-200 print:text-black">
                            {txn.transactionNumber}
                          </td>
                          <td className="py-2 px-3 text-dark-200 print:text-black">
                            {txn.transactionType.toUpperCase()}
                          </td>
                          <td className="py-2 px-3 text-dark-200 print:text-black">
                            {txn.sourceAmount.toFixed(2)} {txn.sourceCurrency}
                          </td>
                          <td className="py-2 px-3 text-dark-200 print:text-black">
                            {txn.targetAmount.toFixed(2)} {txn.targetCurrency}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-dark-200 print:text-black">
                            {formatCurrency(txn.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Filing Information */}
              <div>
                <h4 className="text-sm font-medium text-primary-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Part IV - Financial Institution Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Branch Name</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.branch?.name || "Head Office"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Branch Code</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {ctrReport.branch?.code || "HOF"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Reporting Period</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {formatDate(ctrReport.reportingPeriod.from)} - {formatDate(ctrReport.reportingPeriod.to)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Report Generated</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {formatDateTime(ctrReport.reportDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAR Preview Modal */}
      {showSARPreview && sarReport && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-lg border border-dark-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-900">
              <div className="flex items-center gap-3">
                <FileWarning className="h-5 w-5 text-orange-400" />
                <div>
                  <h3 className="text-lg font-semibold text-dark-50">Suspicious Activity Report (SAR)</h3>
                  <p className="text-sm text-dark-400">FinCEN Form 111 Equivalent</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => handleDownloadReport("SAR")}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => {
                    setShowSARPreview(false)
                    setSelectedAlertId(null)
                  }}
                  className="p-2 rounded-lg hover:bg-dark-800"
                >
                  <X className="h-5 w-5 text-dark-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 print:bg-white print:text-black">
              {/* Report Header */}
              <div className="text-center border-b border-dark-700 pb-4 print:border-gray-300">
                <h2 className="text-xl font-bold text-dark-50 print:text-black">SUSPICIOUS ACTIVITY REPORT</h2>
                <p className="text-sm text-dark-400 print:text-gray-600">
                  Generated: {formatDateTime(sarReport.reportDate)}
                </p>
              </div>

              {/* Alert Information */}
              <div>
                <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Part I - Suspicious Activity Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Alert Type</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {sarReport.alert.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Severity</label>
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded border inline-block",
                      getSeverityBadge(sarReport.alert.severity)
                    )}>
                      {sarReport.alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-dark-400 print:text-gray-500">Description</label>
                    <p className="text-sm text-dark-200 print:text-black mt-1 p-3 bg-dark-700 rounded print:bg-gray-200">
                      {sarReport.alert.description}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Alert Status</label>
                    <p className="text-sm text-dark-200 print:text-black capitalize">
                      {sarReport.alert.status}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Alert Date</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {formatDateTime(sarReport.alert.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subject Information */}
              {sarReport.subject && (
                <div>
                  <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wide print:text-gray-700">
                    Part II - Subject Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Full Name</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.subject.firstName} {sarReport.subject.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Date of Birth</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.subject.dateOfBirth || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">ID Type / Number</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.subject.idType || "N/A"} - {sarReport.subject.idNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Nationality</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.subject.nationality || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Source of Funds</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.subject.sourceOfFunds || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">PEP Status</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.subject.isPEP ? `Yes - ${sarReport.subject.pepDetails || ""}` : "No"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Sanction Status</label>
                      <p className={clsx(
                        "text-sm",
                        sarReport.subject.sanctionScreeningStatus === "flagged"
                          ? "text-red-400 print:text-red-700"
                          : "text-dark-200 print:text-black"
                      )}>
                        {sarReport.subject.sanctionScreeningStatus?.toUpperCase() || "PENDING"}
                      </p>
                    </div>
                    {sarReport.subject.isSuspicious && (
                      <div className="col-span-2">
                        <label className="text-xs text-dark-400 print:text-gray-500">Suspicious Reason</label>
                        <p className="text-sm text-red-400 print:text-red-700">
                          {sarReport.subject.suspiciousReason || "Marked as suspicious"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Information */}
              {sarReport.transaction && (
                <div>
                  <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wide print:text-gray-700">
                    Part III - Suspicious Transaction
                  </h4>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Transaction Number</label>
                      <p className="text-sm font-mono text-dark-200 print:text-black">
                        {sarReport.transaction.transactionNumber}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Type</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.transaction.transactionType.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Amount</label>
                      <p className="text-sm font-medium text-dark-200 print:text-black">
                        {formatCurrency(sarReport.transaction.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">From</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.transaction.sourceAmount.toFixed(2)} {sarReport.transaction.sourceCurrency}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">To</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {sarReport.transaction.targetAmount.toFixed(2)} {sarReport.transaction.targetCurrency}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-dark-400 print:text-gray-500">Date</label>
                      <p className="text-sm text-dark-200 print:text-black">
                        {formatDateTime(sarReport.transaction.date)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Narrative */}
              <div>
                <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Part IV - Narrative
                </h4>
                <div className="p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <p className="text-sm text-dark-200 print:text-black whitespace-pre-wrap">
                    {sarReport.narrative}
                  </p>
                </div>
              </div>

              {/* Related Alerts */}
              {sarReport.relatedAlerts && sarReport.relatedAlerts.length > 1 && (
                <div>
                  <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wide print:text-gray-700">
                    Part V - Related Alerts ({sarReport.relatedAlerts.length})
                  </h4>
                  <div className="space-y-2">
                    {sarReport.relatedAlerts.slice(0, 5).map((alert: {
                      type: string;
                      severity: string;
                      description: string;
                      status: string;
                      createdAt: number;
                    }, idx: number) => (
                      <div key={idx} className="p-3 bg-dark-800/50 rounded-lg print:bg-gray-100 flex items-start gap-3">
                        <AlertTriangle className={clsx(
                          "h-4 w-4 mt-0.5",
                          alert.severity === "critical" ? "text-red-400" :
                          alert.severity === "high" ? "text-orange-400" : "text-yellow-400"
                        )} />
                        <div className="flex-1">
                          <p className="text-sm text-dark-200 print:text-black">{alert.description}</p>
                          <p className="text-xs text-dark-400 print:text-gray-500 mt-1">
                            {formatDate(alert.createdAt)} - {alert.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filing Information */}
              <div>
                <h4 className="text-sm font-medium text-orange-400 mb-3 uppercase tracking-wide print:text-gray-700">
                  Filing Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-lg print:bg-gray-100">
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Branch</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {sarReport.branch?.name || "Head Office"} ({sarReport.branch?.code || "HOF"})
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 print:text-gray-500">Report Generated</label>
                    <p className="text-sm text-dark-200 print:text-black">
                      {formatDateTime(sarReport.reportDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
