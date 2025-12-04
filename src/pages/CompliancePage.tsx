import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpCircle,
  User,
  FileText,
  X,
  Eye,
  Filter,
  RefreshCw,
} from "lucide-react"
import clsx from "clsx"

type AlertStatus = "pending" | "reviewed" | "resolved" | "escalated"

interface AlertWithDetails {
  _id: Id<"complianceAlerts">
  alertType: string
  severity: string
  customerId?: Id<"customers">
  transactionId?: Id<"transactions">
  description: string
  status: string
  reviewedAt?: number
  reviewedBy?: Id<"users">
  resolutionNotes?: string
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
    sourceAmount: number
    sourceCurrency: string
    targetAmount: number
    targetCurrency: string
  }
  reviewedByUser?: {
    _id: Id<"users">
    email?: string
  }
}

export function CompliancePage() {
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [severityFilter, setSeverityFilter] = useState<string>("")
  const [typeFilter, setTypeFilter] = useState<string>("")
  const [selectedAlert, setSelectedAlert] = useState<AlertWithDetails | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")

  const alerts = useQuery(api.compliance.list, {
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    alertType: typeFilter || undefined,
  }) as AlertWithDetails[] | undefined

  const stats = useQuery(api.compliance.getStats)
  const updateStatus = useMutation(api.compliance.updateStatus)

  const handleUpdateStatus = async (id: Id<"complianceAlerts">, status: AlertStatus) => {
    try {
      await updateStatus({
        id,
        status,
        resolutionNotes: resolutionNotes || undefined,
      })
      setShowDetailModal(false)
      setSelectedAlert(null)
      setResolutionNotes("")
    } catch (error) {
      console.error("Failed to update alert status:", error)
    }
  }

  const openDetailModal = (alert: AlertWithDetails) => {
    setSelectedAlert(alert)
    setResolutionNotes(alert.resolutionNotes || "")
    setShowDetailModal(true)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />
    }
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-900/50 text-amber-400 border-amber-700",
      reviewed: "bg-blue-900/50 text-blue-400 border-blue-700",
      resolved: "bg-green-900/50 text-green-400 border-green-700",
      escalated: "bg-purple-900/50 text-purple-400 border-purple-700",
    }
    return colors[status] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "reviewed":
        return <Eye className="h-4 w-4" />
      case "resolved":
        return <CheckCircle className="h-4 w-4" />
      case "escalated":
        return <ArrowUpCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "sanction_match":
        return "Sanction Match"
      case "suspicious_activity":
        return "Suspicious Activity"
      case "threshold_exceeded":
        return "Threshold Exceeded"
      default:
        return type
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Compliance Dashboard</h1>
          <p className="text-dark-400">Monitor and manage compliance alerts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Pending</p>
              <p className="text-2xl font-bold text-dark-50">{stats?.byStatus.pending || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Critical Alerts</p>
              <p className="text-2xl font-bold text-dark-50">{stats?.bySeverity.critical || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Resolved</p>
              <p className="text-2xl font-bold text-dark-50">{stats?.byStatus.resolved || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-dark-400">Escalated</p>
              <p className="text-2xl font-bold text-dark-50">{stats?.byStatus.escalated || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-dark-400">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input text-sm py-1.5"
          >
            <option value="">All Types</option>
            <option value="sanction_match">Sanction Match</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="threshold_exceeded">Threshold Exceeded</option>
          </select>

          {(statusFilter || severityFilter || typeFilter) && (
            <button
              onClick={() => {
                setStatusFilter("")
                setSeverityFilter("")
                setTypeFilter("")
              }}
              className="text-sm text-dark-400 hover:text-dark-200 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700 bg-dark-800/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Severity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Created</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!alerts || alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-dark-400">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No compliance alerts found</p>
                    <p className="text-sm mt-1">All clear! No issues to review.</p>
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert._id} className="border-b border-dark-700 hover:bg-dark-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <span className={clsx(
                          "text-xs px-2 py-0.5 rounded border",
                          getSeverityBadge(alert.severity)
                        )}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-dark-200">
                        {getAlertTypeLabel(alert.alertType)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-dark-200 max-w-xs truncate">
                        {alert.description}
                      </p>
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
                        <span className="text-sm text-dark-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border",
                        getStatusBadge(alert.status)
                      )}>
                        {getStatusIcon(alert.status)}
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-dark-400">
                        {formatDate(alert.createdAt)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openDetailModal(alert)}
                        className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAlert && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-lg border border-dark-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <div className="flex items-center gap-3">
                {getSeverityIcon(selectedAlert.severity)}
                <div>
                  <h3 className="text-lg font-semibold text-dark-50">Alert Details</h3>
                  <p className="text-sm text-dark-400">
                    {getAlertTypeLabel(selectedAlert.alertType)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedAlert(null)
                }}
                className="p-2 rounded-lg hover:bg-dark-800"
              >
                <X className="h-5 w-5 text-dark-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Alert Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Severity</label>
                  <span className={clsx(
                    "inline-flex text-xs px-2 py-1 rounded border",
                    getSeverityBadge(selectedAlert.severity)
                  )}>
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Current Status</label>
                  <span className={clsx(
                    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded border",
                    getStatusBadge(selectedAlert.status)
                  )}>
                    {getStatusIcon(selectedAlert.status)}
                    {selectedAlert.status.charAt(0).toUpperCase() + selectedAlert.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Created</label>
                  <p className="text-sm text-dark-200">{formatDate(selectedAlert.createdAt)}</p>
                </div>
                {selectedAlert.reviewedAt && (
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">Reviewed</label>
                    <p className="text-sm text-dark-200">{formatDate(selectedAlert.reviewedAt)}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-dark-400 mb-1">Description</label>
                <p className="text-sm text-dark-200 p-3 bg-dark-800 rounded-lg">
                  {selectedAlert.description}
                </p>
              </div>

              {/* Customer Info */}
              {selectedAlert.customer && (
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Related Customer</label>
                  <div className="p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-dark-400" />
                      <div>
                        <p className="text-sm text-dark-200 font-medium">
                          {selectedAlert.customer.firstName} {selectedAlert.customer.lastName}
                        </p>
                        {selectedAlert.customer.email && (
                          <p className="text-xs text-dark-400">{selectedAlert.customer.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Info */}
              {selectedAlert.transaction && (
                <div>
                  <label className="block text-sm text-dark-400 mb-1">Related Transaction</label>
                  <div className="p-3 bg-dark-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-dark-400" />
                      <div>
                        <p className="text-sm text-dark-200 font-medium">
                          {selectedAlert.transaction.transactionNumber}
                        </p>
                        <p className="text-xs text-dark-400">
                          {selectedAlert.transaction.sourceAmount} {selectedAlert.transaction.sourceCurrency}
                          {" -> "}
                          {selectedAlert.transaction.targetAmount} {selectedAlert.transaction.targetCurrency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="block text-sm text-dark-400 mb-1">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about this alert..."
                  className="input w-full h-24 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-dark-700">
                {selectedAlert.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert._id, "reviewed")}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Mark as Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert._id, "resolved")}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert._id, "escalated")}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center gap-2"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Escalate
                    </button>
                  </>
                )}
                {selectedAlert.status === "reviewed" && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert._id, "resolved")}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedAlert._id, "escalated")}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center gap-2"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Escalate
                    </button>
                  </>
                )}
                {selectedAlert.status === "escalated" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedAlert._id, "resolved")}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Resolve
                  </button>
                )}
                {selectedAlert.status === "resolved" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedAlert._id, "pending")}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reopen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
