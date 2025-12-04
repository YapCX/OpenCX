import { useState, useRef } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  Plus,
  Search,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Globe,
  Briefcase,
  Shield,
  ChevronRight,
  Upload,
  Trash2,
  Building,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Flag,
  UserCheck,
  Save,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"
import clsx from "clsx"

type KycStatus = "pending" | "verified" | "rejected"
type TabType = "details" | "kyc_aml" | "documents" | "bank" | "transactions"

interface CustomerFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  dateOfBirth: string
  idType: string
  idNumber: string
  idExpiryDate: string
  nationality: string
  occupation: string
  notes: string
}

interface BankFormData {
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber: string
  swiftCode: string
  iban: string
  bankAddress: string
  currency: string
  isDefault: boolean
}

const emptyFormData: CustomerFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  dateOfBirth: "",
  idType: "",
  idNumber: "",
  idExpiryDate: "",
  nationality: "",
  occupation: "",
  notes: "",
}

export function CustomersPage() {
  const customers = useQuery(api.customers.list, {}) || []
  const createCustomer = useMutation(api.customers.create)
  const updateCustomer = useMutation(api.customers.update)
  const rescreenSanctions = useMutation(api.customers.rescreenSanctions)

  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<Id<"customers"> | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>(emptyFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("details")
  const [sanctionResult, setSanctionResult] = useState<string | null>(null)

  const filteredCustomers = customers.filter(
    (c) =>
      c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
  )

  const handleOpenModal = (customer?: typeof customers[0]) => {
    if (customer) {
      setEditingId(customer._id)
      setFormData({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        dateOfBirth: customer.dateOfBirth || "",
        idType: customer.idType || "",
        idNumber: customer.idNumber || "",
        idExpiryDate: customer.idExpiryDate || "",
        nationality: customer.nationality || "",
        occupation: customer.occupation || "",
        notes: customer.notes || "",
      })
    } else {
      setEditingId(null)
      setFormData(emptyFormData)
    }
    setSanctionResult(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData(emptyFormData)
    setSanctionResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingId) {
        await updateCustomer({
          id: editingId,
          ...formData,
        })
        handleCloseModal()
      } else {
        const result = await createCustomer(formData)
        if (result.sanctionStatus === "flagged") {
          setSanctionResult("flagged")
        } else {
          setSanctionResult("clear")
          setTimeout(() => handleCloseModal(), 1500)
        }
      }
    } catch (error) {
      console.error("Error saving customer:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRescreen = async (customerId: Id<"customers">) => {
    try {
      await rescreenSanctions({ id: customerId })
    } catch (error) {
      console.error("Error rescreening:", error)
    }
  }

  const getKycStatusBadge = (status: KycStatus) => {
    const styles = {
      pending: "bg-yellow-900/50 text-yellow-400",
      verified: "bg-green-900/50 text-green-400",
      rejected: "bg-red-900/50 text-red-400",
    }
    return (
      <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", styles[status])}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const selectedCustomerData = selectedCustomer
    ? customers.find((c) => c._id === selectedCustomer)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Customers</h1>
          <p className="text-dark-400">Manage customer profiles and KYC information</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Individual
        </button>
      </div>

      <div className="flex gap-6">
        <div className={clsx("flex-1 space-y-4", selectedCustomer && "max-w-md")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          <div className="card divide-y divide-dark-700">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <User className="h-12 w-12 mx-auto mb-4 text-dark-600" />
                {searchTerm ? (
                  <p>No customers match your search.</p>
                ) : (
                  <>
                    <p>No customers yet.</p>
                    <p className="text-sm mt-2 text-dark-500">
                      Click "Add Individual" to create your first customer.
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => {
                    setSelectedCustomer(customer._id)
                    setActiveTab("details")
                  }}
                  className={clsx(
                    "flex items-center justify-between p-4 cursor-pointer transition-colors",
                    selectedCustomer === customer._id
                      ? "bg-primary-900/20"
                      : "hover:bg-dark-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-dark-700 flex items-center justify-center text-dark-300">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-dark-100">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-sm text-dark-400">
                        {customer.email || customer.phone || "No contact info"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {customer.sanctionScreeningStatus === "flagged" && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    {getKycStatusBadge(customer.kycStatus as KycStatus)}
                    <ChevronRight className="h-5 w-5 text-dark-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedCustomer && selectedCustomerData && (
          <CustomerDetailPanel
            customer={selectedCustomerData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onEdit={() => handleOpenModal(selectedCustomerData)}
            onClose={() => setSelectedCustomer(null)}
            onRescreen={() => handleRescreen(selectedCustomerData._id)}
            getKycStatusBadge={getKycStatusBadge}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold text-dark-50">
                {editingId ? "Edit Customer" : "Add New Individual"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-dark-400 hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sanctionResult && (
              <div className={clsx(
                "mx-6 mt-4 p-4 rounded-lg flex items-center gap-3",
                sanctionResult === "clear" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
              )}>
                {sanctionResult === "clear" ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Sanction screening passed - Customer cleared</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    <span>Sanction screening flagged - Manual review required</span>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., United States"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Occupation
                </label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div className="border-t border-dark-700 pt-6">
                <h3 className="text-sm font-medium text-dark-300 mb-4">Identification</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-400 mb-2">
                      ID Type
                    </label>
                    <select
                      value={formData.idType}
                      onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">Select type</option>
                      <option value="passport">Passport</option>
                      <option value="driver_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                      <option value="residence_permit">Residence Permit</option>
                      <option value="military_id">Military ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-400 mb-2">
                      ID Number
                    </label>
                    <input
                      type="text"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-400 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.idExpiryDate}
                      onChange={(e) => setFormData({ ...formData, idExpiryDate: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                <button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? "Saving..." : editingId ? "Update Customer" : "Save & Check Sanctions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerDetailPanel({
  customer,
  activeTab,
  setActiveTab,
  onEdit,
  onClose,
  onRescreen,
  getKycStatusBadge,
}: {
  customer: any
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  onEdit: () => void
  onClose: () => void
  onRescreen: () => void
  getKycStatusBadge: (status: KycStatus) => JSX.Element
}) {
  return (
    <div className="flex-1 card p-0 overflow-hidden">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-dark-700 flex items-center justify-center">
              <User className="h-7 w-7 text-dark-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-dark-50">
                {customer.firstName} {customer.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {getKycStatusBadge(customer.kycStatus as KycStatus)}
                {customer.sanctionScreeningStatus && (
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
                      customer.sanctionScreeningStatus === "clear"
                        ? "bg-green-900/50 text-green-400"
                        : customer.sanctionScreeningStatus === "flagged"
                        ? "bg-red-900/50 text-red-400"
                        : "bg-yellow-900/50 text-yellow-400"
                    )}
                  >
                    {customer.sanctionScreeningStatus === "flagged" && <AlertTriangle className="h-3 w-3" />}
                    {customer.sanctionScreeningStatus === "clear" && <CheckCircle className="h-3 w-3" />}
                    Sanctions: {customer.sanctionScreeningStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRescreen}
              className="btn-secondary text-sm flex items-center gap-1"
              title="Re-check Sanction List"
            >
              <RefreshCw className="h-4 w-4" />
              Rescreen
            </button>
            <button
              onClick={onEdit}
              className="btn-secondary text-sm"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-2 text-dark-400 hover:text-dark-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-dark-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab("details")}
            className={clsx(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "details"
                ? "border-primary-500 text-primary-400"
                : "border-transparent text-dark-400 hover:text-dark-200"
            )}
          >
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Details
            </span>
          </button>
          <button
            onClick={() => setActiveTab("kyc_aml")}
            className={clsx(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "kyc_aml"
                ? "border-primary-500 text-primary-400"
                : "border-transparent text-dark-400 hover:text-dark-200"
            )}
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              KYC/AML
            </span>
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={clsx(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "documents"
                ? "border-primary-500 text-primary-400"
                : "border-transparent text-dark-400 hover:text-dark-200"
            )}
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Supporting Documents
            </span>
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={clsx(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "bank"
                ? "border-primary-500 text-primary-400"
                : "border-transparent text-dark-400 hover:text-dark-200"
            )}
          >
            <span className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Bank Info
            </span>
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={clsx(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "transactions"
                ? "border-primary-500 text-primary-400"
                : "border-transparent text-dark-400 hover:text-dark-200"
            )}
          >
            <span className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Transactions
            </span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === "details" && <PersonalDetailsTab customer={customer} />}
        {activeTab === "kyc_aml" && <KycAmlTab customer={customer} />}
        {activeTab === "documents" && <DocumentsTab customerId={customer._id} />}
        {activeTab === "bank" && <BankInfoTab customerId={customer._id} />}
        {activeTab === "transactions" && <TransactionsTab customerId={customer._id} />}
      </div>
    </div>
  )
}

function PersonalDetailsTab({ customer }: { customer: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {customer.email && (
          <div className="flex items-center gap-2 text-dark-300">
            <Mail className="h-4 w-4 text-dark-500" />
            <span className="text-sm">{customer.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2 text-dark-300">
            <Phone className="h-4 w-4 text-dark-500" />
            <span className="text-sm">{customer.phone}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-2 text-dark-300 col-span-2">
            <MapPin className="h-4 w-4 text-dark-500" />
            <span className="text-sm">{customer.address}</span>
          </div>
        )}
        {customer.dateOfBirth && (
          <div className="flex items-center gap-2 text-dark-300">
            <Calendar className="h-4 w-4 text-dark-500" />
            <span className="text-sm">DOB: {customer.dateOfBirth}</span>
          </div>
        )}
        {customer.nationality && (
          <div className="flex items-center gap-2 text-dark-300">
            <Globe className="h-4 w-4 text-dark-500" />
            <span className="text-sm">{customer.nationality}</span>
          </div>
        )}
        {customer.occupation && (
          <div className="flex items-center gap-2 text-dark-300">
            <Briefcase className="h-4 w-4 text-dark-500" />
            <span className="text-sm">{customer.occupation}</span>
          </div>
        )}
      </div>

      {(customer.idType || customer.idNumber) && (
        <div className="border-t border-dark-700 pt-4">
          <h3 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Identification
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {customer.idType && (
              <div>
                <p className="text-dark-500">ID Type</p>
                <p className="text-dark-200">{customer.idType.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
              </div>
            )}
            {customer.idNumber && (
              <div>
                <p className="text-dark-500">ID Number</p>
                <p className="text-dark-200">{customer.idNumber}</p>
              </div>
            )}
            {customer.idExpiryDate && (
              <div>
                <p className="text-dark-500">Expiry Date</p>
                <p className="text-dark-200">{customer.idExpiryDate}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {customer.sanctionScreeningDate && (
        <div className="border-t border-dark-700 pt-4">
          <h3 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sanction Screening
          </h3>
          <div className="text-sm">
            <p className="text-dark-500">Last Screened</p>
            <p className="text-dark-200">
              {new Date(customer.sanctionScreeningDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      {customer.notes && (
        <div className="border-t border-dark-700 pt-4">
          <h3 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </h3>
          <p className="text-dark-300 text-sm">{customer.notes}</p>
        </div>
      )}

      <div className="border-t border-dark-700 pt-4">
        <p className="text-xs text-dark-500">
          Created{" "}
          {new Date(customer.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </div>
  )
}

function KycAmlTab({ customer }: { customer: any }) {
  const updateKycAml = useMutation(api.customers.updateKycAml)
  const updateSanctionWhitelist = useMutation(api.customers.updateSanctionWhitelist)
  const lookups = useQuery(api.lookups.listActiveByKey, { lookupKey: "source_of_funds" }) || []

  const [formData, setFormData] = useState({
    estimatedAssetWorth: customer.estimatedAssetWorth || "",
    sourceOfFunds: customer.sourceOfFunds || "",
    isSuspicious: customer.isSuspicious || false,
    suspiciousReason: customer.suspiciousReason || "",
    isPEP: customer.isPEP || false,
    pepDetails: customer.pepDetails || "",
  })

  const [whitelistData, setWhitelistData] = useState({
    sanctionFalsePositive: customer.sanctionFalsePositive || false,
    falsePositiveBasis: customer.falsePositiveBasis || "",
    isWhitelisted: customer.isWhitelisted || false,
    whitelistExpiryDate: customer.whitelistExpiryDate || "",
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isSavingWhitelist, setIsSavingWhitelist] = useState(false)

  const handleSaveKycAml = async () => {
    setIsSaving(true)
    try {
      await updateKycAml({
        id: customer._id,
        ...formData,
      })
    } catch (error) {
      console.error("Error saving KYC/AML:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveWhitelist = async () => {
    setIsSavingWhitelist(true)
    try {
      await updateSanctionWhitelist({
        id: customer._id,
        ...whitelistData,
      })
    } catch (error) {
      console.error("Error saving whitelist:", error)
    } finally {
      setIsSavingWhitelist(false)
    }
  }

  const assetWorthOptions = [
    "Under $10,000",
    "$10,000 - $50,000",
    "$50,000 - $100,000",
    "$100,000 - $500,000",
    "$500,000 - $1,000,000",
    "Over $1,000,000",
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Enhanced Due Diligence
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-2">
              Estimated Asset Worth
            </label>
            <select
              value={formData.estimatedAssetWorth}
              onChange={(e) => setFormData({ ...formData, estimatedAssetWorth: e.target.value })}
              className="input w-full"
            >
              <option value="">Select range</option>
              {assetWorthOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-2">
              Source of Funds
            </label>
            <select
              value={formData.sourceOfFunds}
              onChange={(e) => setFormData({ ...formData, sourceOfFunds: e.target.value })}
              className="input w-full"
            >
              <option value="">Select source</option>
              {lookups.map((lookup) => (
                <option key={lookup._id} value={lookup.lookupValue}>{lookup.lookupValue}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-dark-700">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isSuspicious"
              checked={formData.isSuspicious}
              onChange={(e) => setFormData({ ...formData, isSuspicious: e.target.checked })}
              className="rounded border-dark-600 bg-dark-700 text-red-500"
            />
            <label htmlFor="isSuspicious" className="text-sm text-dark-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Mark as Suspicious
            </label>
          </div>

          {formData.isSuspicious && (
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">
                Reason for Suspicion *
              </label>
              <textarea
                value={formData.suspiciousReason}
                onChange={(e) => setFormData({ ...formData, suspiciousReason: e.target.value })}
                className="input w-full"
                rows={2}
                placeholder="Describe the reason for marking this customer as suspicious..."
              />
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-dark-700">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPEP"
              checked={formData.isPEP}
              onChange={(e) => setFormData({ ...formData, isPEP: e.target.checked })}
              className="rounded border-dark-600 bg-dark-700 text-yellow-500"
            />
            <label htmlFor="isPEP" className="text-sm text-dark-300 flex items-center gap-2">
              <Flag className="h-4 w-4 text-yellow-500" />
              Politically Exposed Person (PEP)
            </label>
          </div>

          {formData.isPEP && (
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-2">
                PEP Details
              </label>
              <textarea
                value={formData.pepDetails}
                onChange={(e) => setFormData({ ...formData, pepDetails: e.target.value })}
                className="input w-full"
                rows={2}
                placeholder="Position, relationship to PEP, etc..."
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSaveKycAml}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save KYC/AML Data"}
          </button>
        </div>
      </div>

      {customer.sanctionScreeningStatus === "flagged" && (
        <div className="space-y-4 pt-6 border-t border-dark-700">
          <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Sanction List Whitelisting
          </h3>

          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Sanction Match Detected</span>
            </div>
            <p className="text-sm text-dark-400">
              This customer has been flagged for matching a sanction list entry.
              Review the match and determine if it is a false positive.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sanctionFalsePositive"
                checked={whitelistData.sanctionFalsePositive}
                onChange={(e) => setWhitelistData({ ...whitelistData, sanctionFalsePositive: e.target.checked })}
                className="rounded border-dark-600 bg-dark-700 text-green-500"
              />
              <label htmlFor="sanctionFalsePositive" className="text-sm text-dark-300">
                Match is a False Positive
              </label>
            </div>

            {whitelistData.sanctionFalsePositive && (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark-400 mb-2">
                    Basis of Determination *
                  </label>
                  <textarea
                    value={whitelistData.falsePositiveBasis}
                    onChange={(e) => setWhitelistData({ ...whitelistData, falsePositiveBasis: e.target.value })}
                    className="input w-full"
                    rows={2}
                    placeholder="Explain why this is a false positive..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isWhitelisted"
                    checked={whitelistData.isWhitelisted}
                    onChange={(e) => setWhitelistData({ ...whitelistData, isWhitelisted: e.target.checked })}
                    className="rounded border-dark-600 bg-dark-700 text-green-500"
                  />
                  <label htmlFor="isWhitelisted" className="text-sm text-dark-300">
                    Whitelist this Customer
                  </label>
                </div>

                {whitelistData.isWhitelisted && (
                  <div>
                    <label className="block text-sm font-medium text-dark-400 mb-2">
                      Whitelist Expiry Date
                    </label>
                    <input
                      type="date"
                      value={whitelistData.whitelistExpiryDate}
                      onChange={(e) => setWhitelistData({ ...whitelistData, whitelistExpiryDate: e.target.value })}
                      className="input w-full max-w-xs"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveWhitelist}
              disabled={isSavingWhitelist || !whitelistData.sanctionFalsePositive}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSavingWhitelist ? "Saving..." : "Save Whitelist Settings"}
            </button>
          </div>
        </div>
      )}

      {customer.isWhitelisted && (
        <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Customer Whitelisted</span>
          </div>
          <p className="text-sm text-dark-400">
            This customer has been whitelisted.
            {customer.whitelistExpiryDate && (
              <> Expires on {customer.whitelistExpiryDate}.</>
            )}
          </p>
          {customer.falsePositiveBasis && (
            <p className="text-sm text-dark-500 mt-2">
              Basis: {customer.falsePositiveBasis}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function DocumentsTab({ customerId }: { customerId: Id<"customers"> }) {
  const documents = useQuery(api.customerDocuments.listByCustomer, { customerId }) || []
  const generateUploadUrl = useMutation(api.customerDocuments.generateUploadUrl)
  const createDocument = useMutation(api.customerDocuments.create)
  const removeDocument = useMutation(api.customerDocuments.remove)

  const [isUploading, setIsUploading] = useState(false)
  const [documentType, setDocumentType] = useState("id_front")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await response.json()

      await createDocument({
        customerId,
        documentType,
        fileName: file.name,
        storageId,
      })
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (docId: Id<"customerDocuments">) => {
    if (confirm("Are you sure you want to delete this document?")) {
      await removeDocument({ id: docId })
    }
  }

  const documentTypeLabels: Record<string, string> = {
    id_front: "ID Front",
    id_back: "ID Back",
    proof_of_address: "Proof of Address",
    selfie: "Selfie with ID",
    other: "Other",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="input"
        >
          <option value="id_front">ID Front</option>
          <option value="id_back">ID Back</option>
          <option value="proof_of_address">Proof of Address</option>
          <option value="selfie">Selfie with ID</option>
          <option value="other">Other</option>
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-dark-400">
          <FileText className="h-12 w-12 mx-auto mb-4 text-dark-600" />
          <p>No documents uploaded yet.</p>
          <p className="text-sm mt-2 text-dark-500">
            Upload ID images and proof of address for KYC verification.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentItem
              key={doc._id}
              doc={doc}
              typeLabel={documentTypeLabels[doc.documentType] || doc.documentType}
              onDelete={() => handleDelete(doc._id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentItem({
  doc,
  typeLabel,
  onDelete,
}: {
  doc: any
  typeLabel: string
  onDelete: () => void
}) {
  const url = useQuery(api.customerDocuments.getUrl, { storageId: doc.storageId })

  return (
    <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-dark-700 rounded flex items-center justify-center">
          <FileText className="h-5 w-5 text-dark-400" />
        </div>
        <div>
          <p className="text-dark-200 font-medium">{typeLabel}</p>
          <p className="text-sm text-dark-500">{doc.fileName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            View
          </a>
        )}
        <button
          onClick={onDelete}
          className="p-2 text-dark-400 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function BankInfoTab({ customerId }: { customerId: Id<"customers"> }) {
  const bankAccounts = useQuery(api.customerBankInfo.listByCustomer, { customerId }) || []
  const createBankInfo = useMutation(api.customerBankInfo.create)
  const removeBankInfo = useMutation(api.customerBankInfo.remove)

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<BankFormData>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: "",
    swiftCode: "",
    iban: "",
    bankAddress: "",
    currency: "USD",
    isDefault: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await createBankInfo({
        customerId,
        ...formData,
      })
      setShowForm(false)
      setFormData({
        bankName: "",
        accountName: "",
        accountNumber: "",
        routingNumber: "",
        swiftCode: "",
        iban: "",
        bankAddress: "",
        currency: "USD",
        isDefault: false,
      })
    } catch (error) {
      console.error("Error creating bank info:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: Id<"customerBankInfo">) => {
    if (confirm("Are you sure you want to delete this wire template?")) {
      await removeBankInfo({ id })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-dark-300">Wire Templates</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Wire Template
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-dark-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">Bank Name *</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">Account Name *</label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="input w-full"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">Account Number *</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">Currency *</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input w-full"
                required
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="CHF">CHF</option>
                <option value="AUD">AUD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">Routing Number</label>
              <input
                type="text"
                value={formData.routingNumber}
                onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">SWIFT Code</label>
              <input
                type="text"
                value={formData.swiftCode}
                onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">IBAN</label>
            <input
              type="text"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-400 mb-1">Bank Address</label>
            <input
              type="text"
              value={formData.bankAddress}
              onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
              className="input w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded border-dark-600 bg-dark-700 text-primary-500"
            />
            <label htmlFor="isDefault" className="text-sm text-dark-300">Set as default</label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary text-sm">
              {isSubmitting ? "Saving..." : "Save Wire Template"}
            </button>
          </div>
        </form>
      )}

      {bankAccounts.length === 0 && !showForm ? (
        <div className="text-center py-8 text-dark-400">
          <Building className="h-12 w-12 mx-auto mb-4 text-dark-600" />
          <p>No wire templates configured.</p>
          <p className="text-sm mt-2 text-dark-500">
            Add bank information for wire transfers.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <div key={account._id} className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-dark-700 rounded flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-dark-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-dark-200 font-medium">{account.bankName}</p>
                    {account.isDefault && (
                      <span className="px-2 py-0.5 bg-primary-900/50 text-primary-400 text-xs rounded">Default</span>
                    )}
                  </div>
                  <p className="text-sm text-dark-500">
                    {account.accountName} • ****{account.accountNumber.slice(-4)} • {account.currency}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(account._id)}
                className="p-2 text-dark-400 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TransactionsTab({ customerId }: { customerId: Id<"customers"> }) {
  const transactions = useQuery(api.transactions.getByCustomer, { customerId }) || []

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number, currency: string): string => {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-dark-300">Transaction History</h3>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-dark-400">
          <Receipt className="h-12 w-12 mx-auto mb-4 text-dark-600" />
          <p>No transactions yet.</p>
          <p className="text-sm mt-2 text-dark-500">
            Transactions linked to this customer will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx._id}
              className="flex items-center justify-between p-4 bg-dark-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    tx.transactionType === "buy"
                      ? "bg-green-900/50"
                      : "bg-red-900/50"
                  )}
                >
                  {tx.transactionType === "buy" ? (
                    <ArrowDownLeft className="h-5 w-5 text-green-400" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        tx.transactionType === "buy"
                          ? "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      )}
                    >
                      {tx.transactionType.toUpperCase()}
                    </span>
                    <span className="text-dark-200 font-mono text-sm">
                      {tx.transactionNumber}
                    </span>
                  </div>
                  <p className="text-sm text-dark-400 mt-1">
                    {tx.sourceCurrency} → {tx.targetCurrency} @ {tx.exchangeRate.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-dark-200 font-medium">
                  {formatCurrency(tx.sourceAmount, tx.sourceCurrency)}
                </p>
                <p className="text-sm text-dark-400">
                  → {formatCurrency(tx.targetAmount, tx.targetCurrency)}
                </p>
                <p className="text-xs text-dark-500 mt-1">{formatDate(tx.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
