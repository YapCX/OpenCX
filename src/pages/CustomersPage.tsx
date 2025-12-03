import { useState } from "react"
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
} from "lucide-react"
import clsx from "clsx"

type KycStatus = "pending" | "verified" | "rejected"

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

  const [searchTerm, setSearchTerm] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<Id<"customers"> | null>(null)
  const [formData, setFormData] = useState<CustomerFormData>(emptyFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | null>(null)

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
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData(emptyFormData)
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
      } else {
        await createCustomer(formData)
      }
      handleCloseModal()
    } catch (error) {
      console.error("Error saving customer:", error)
    } finally {
      setIsSubmitting(false)
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
          Add Customer
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
                      Click "Add Customer" to create your first customer.
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => setSelectedCustomer(customer._id)}
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
                    {getKycStatusBadge(customer.kycStatus as KycStatus)}
                    <ChevronRight className="h-5 w-5 text-dark-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedCustomer && selectedCustomerData && (
          <div className="flex-1 card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-dark-700 flex items-center justify-center">
                  <User className="h-7 w-7 text-dark-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-dark-50">
                    {selectedCustomerData.firstName} {selectedCustomerData.lastName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getKycStatusBadge(selectedCustomerData.kycStatus as KycStatus)}
                    {selectedCustomerData.sanctionScreeningStatus && (
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          selectedCustomerData.sanctionScreeningStatus === "clear"
                            ? "bg-green-900/50 text-green-400"
                            : selectedCustomerData.sanctionScreeningStatus === "flagged"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-yellow-900/50 text-yellow-400"
                        )}
                      >
                        Sanctions: {selectedCustomerData.sanctionScreeningStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(selectedCustomerData)}
                  className="btn-secondary text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-dark-400 hover:text-dark-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedCustomerData.email && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Mail className="h-4 w-4 text-dark-500" />
                  <span className="text-sm">{selectedCustomerData.email}</span>
                </div>
              )}
              {selectedCustomerData.phone && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Phone className="h-4 w-4 text-dark-500" />
                  <span className="text-sm">{selectedCustomerData.phone}</span>
                </div>
              )}
              {selectedCustomerData.address && (
                <div className="flex items-center gap-2 text-dark-300 col-span-2">
                  <MapPin className="h-4 w-4 text-dark-500" />
                  <span className="text-sm">{selectedCustomerData.address}</span>
                </div>
              )}
              {selectedCustomerData.dateOfBirth && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Calendar className="h-4 w-4 text-dark-500" />
                  <span className="text-sm">DOB: {selectedCustomerData.dateOfBirth}</span>
                </div>
              )}
              {selectedCustomerData.nationality && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Globe className="h-4 w-4 text-dark-500" />
                  <span className="text-sm">{selectedCustomerData.nationality}</span>
                </div>
              )}
              {selectedCustomerData.occupation && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Briefcase className="h-4 w-4 text-dark-500" />
                  <span className="text-sm">{selectedCustomerData.occupation}</span>
                </div>
              )}
            </div>

            {(selectedCustomerData.idType || selectedCustomerData.idNumber) && (
              <div className="border-t border-dark-700 pt-4">
                <h3 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Identification
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedCustomerData.idType && (
                    <div>
                      <p className="text-dark-500">ID Type</p>
                      <p className="text-dark-200">{selectedCustomerData.idType}</p>
                    </div>
                  )}
                  {selectedCustomerData.idNumber && (
                    <div>
                      <p className="text-dark-500">ID Number</p>
                      <p className="text-dark-200">{selectedCustomerData.idNumber}</p>
                    </div>
                  )}
                  {selectedCustomerData.idExpiryDate && (
                    <div>
                      <p className="text-dark-500">Expiry Date</p>
                      <p className="text-dark-200">{selectedCustomerData.idExpiryDate}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedCustomerData.notes && (
              <div className="border-t border-dark-700 pt-4">
                <h3 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h3>
                <p className="text-dark-300 text-sm">{selectedCustomerData.notes}</p>
              </div>
            )}

            <div className="border-t border-dark-700 pt-4">
              <p className="text-xs text-dark-500">
                Created{" "}
                {new Date(selectedCustomerData.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold text-dark-50">
                {editingId ? "Edit Customer" : "Add New Customer"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-dark-400 hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="input w-full"
                  />
                </div>
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
                      <option value="other">Other</option>
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
                  {isSubmitting ? "Saving..." : editingId ? "Update Customer" : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
