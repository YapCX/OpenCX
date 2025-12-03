import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  Building2,
  Users,
  Cog,
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Save,
  Upload,
  List,
} from 'lucide-react'

type SettingsTab = 'preferences' | 'company' | 'branches' | 'users' | 'lookups'

interface Branch {
  _id: Id<"branches">
  name: string
  code: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as SettingsTab | null
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || 'branches')

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const tabs = [
    { id: 'preferences' as const, name: 'Preferences', icon: Cog },
    { id: 'company' as const, name: 'Company Profile', icon: Building2 },
    { id: 'branches' as const, name: 'Branches', icon: GitBranch },
    { id: 'users' as const, name: 'Users', icon: Users },
    { id: 'lookups' as const, name: 'Lookups', icon: List },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Settings</h1>
        <p className="text-dark-400">Manage your system configuration and preferences</p>
      </div>

      <div className="border-b border-dark-700">
        <nav className="flex gap-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-300 hover:border-dark-600'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'preferences' && <PreferencesSection />}
        {activeTab === 'company' && <CompanyProfileSection />}
        {activeTab === 'branches' && <BranchesSection />}
        {activeTab === 'users' && <UsersSection />}
        {activeTab === 'lookups' && <LookupsSection />}
      </div>
    </div>
  )
}

function PreferencesSection() {
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeZone, setTimeZone] = useState('America/New_York')
  const [numberFormat, setNumberFormat] = useState('1,234.56')
  const [maxRoundingError, setMaxRoundingError] = useState('0.01')
  const [smallestDenomination, setSmallestDenomination] = useState('0.05')
  const [autoFixRounding, setAutoFixRounding] = useState(true)
  const [defaultPrintFormat, setDefaultPrintFormat] = useState('thermal_80mm')
  const [printCustomerAddress, setPrintCustomerAddress] = useState(true)
  const [printDenominations, setPrintDenominations] = useState(false)
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <div className="card-header">Date & Number Settings</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="label">Date Format</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="input"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="label">Time Zone</label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="input"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
            </select>
          </div>
          <div>
            <label className="label">Number Format</label>
            <select
              value={numberFormat}
              onChange={(e) => setNumberFormat(e.target.value)}
              className="input"
            >
              <option value="1,234.56">1,234.56 (US)</option>
              <option value="1.234,56">1.234,56 (EU)</option>
              <option value="1 234.56">1 234.56 (FR)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Rounding Settings</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="label">Max Rounding Error</label>
            <input
              type="text"
              value={maxRoundingError}
              onChange={(e) => setMaxRoundingError(e.target.value)}
              className="input"
              placeholder="0.01"
            />
            <p className="text-xs text-dark-500 mt-1">Maximum allowed rounding difference</p>
          </div>
          <div>
            <label className="label">Smallest Denomination for Rounding</label>
            <input
              type="text"
              value={smallestDenomination}
              onChange={(e) => setSmallestDenomination(e.target.value)}
              className="input"
              placeholder="0.05"
            />
            <p className="text-xs text-dark-500 mt-1">e.g., 0.05 for nickel rounding</p>
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoFixRounding}
                onChange={(e) => setAutoFixRounding(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-dark-200">Auto Fix Round Off Error during Invoice</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Invoice / Receipt Settings</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Default Print Format</label>
            <select
              value={defaultPrintFormat}
              onChange={(e) => setDefaultPrintFormat(e.target.value)}
              className="input"
            >
              <option value="thermal_80mm">Thermal 80mm</option>
              <option value="thermal_58mm">Thermal 58mm</option>
              <option value="a4">A4 Paper</option>
              <option value="letter">Letter Size</option>
            </select>
          </div>
          <div className="space-y-4 pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={printCustomerAddress}
                onChange={(e) => setPrintCustomerAddress(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-dark-200">Print Customer Address on Receipt</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={printDenominations}
                onChange={(e) => setPrintDenominations(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-dark-200">Print Denominations entries on the receipt</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPrintInvoice}
                onChange={(e) => setAutoPrintInvoice(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-dark-200">Automatically print Invoice after saving</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}

function CompanyProfileSection() {
  const [companyName, setCompanyName] = useState('OpenCX Exchange')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">Company Information</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="label">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input"
              placeholder="Your Company Name"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input"
              placeholder="Street Address"
            />
          </div>
          <div>
            <label className="label">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input"
              placeholder="City"
            />
          </div>
          <div>
            <label className="label">State / Province</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="input"
              placeholder="State or Province"
            />
          </div>
          <div>
            <label className="label">Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="input"
              placeholder="Postal Code"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="contact@company.com"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Company Logo</div>
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-dark-800 border-2 border-dashed border-dark-600 rounded-lg flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Company Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="h-12 w-12 text-dark-600" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-dark-300 text-sm mb-3">
              Upload your company logo to display on receipts and reports. Recommended size: 200x200px.
            </p>
            <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload Logo
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="btn-primary flex items-center gap-2"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Company Profile'}
        </button>
      </div>
    </div>
  )
}

function BranchesSection() {
  const branches = useQuery(api.branches.list)
  const createBranch = useMutation(api.branches.create)
  const updateBranch = useMutation(api.branches.update)
  const deleteBranch = useMutation(api.branches.remove)
  const seedBranch = useMutation(api.branches.seedDefaultBranch)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"branches"> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
  })

  const resetForm = () => {
    setFormData({ name: '', code: '', address: '', phone: '' })
    setError(null)
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.code) {
      setError('Name and Code are required')
      return
    }
    if (formData.code.length !== 3) {
      setError('Branch code must be exactly 3 characters')
      return
    }

    try {
      await createBranch({
        name: formData.name,
        code: formData.code,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
      })
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch')
    }
  }

  const handleEdit = async () => {
    if (!editingBranch || !formData.name) {
      setError('Name is required')
      return
    }

    try {
      await updateBranch({
        id: editingBranch._id,
        name: formData.name,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
      })
      setEditingBranch(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branch')
    }
  }

  const handleDelete = async (id: Id<"branches">) => {
    try {
      await deleteBranch({ id })
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete branch')
      setDeleteConfirm(null)
    }
  }

  const handleToggleActive = async (branch: Branch) => {
    await updateBranch({
      id: branch._id,
      isActive: !branch.isActive,
    })
  }

  const openEditModal = (branch: Branch) => {
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
    })
    setEditingBranch(branch)
    setError(null)
  }

  const handleSeedBranch = async () => {
    await seedBranch({})
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-dark-100">Branches</h2>
        <div className="flex gap-2">
          {branches?.length === 0 && (
            <button
              onClick={handleSeedBranch}
              className="btn-secondary"
            >
              Create Head Office
            </button>
          )}
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Branch
          </button>
        </div>
      </div>

      <div className="card p-0">
        {!branches ? (
          <div className="p-8 text-center text-dark-400">Loading branches...</div>
        ) : branches.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            <GitBranch className="h-12 w-12 mx-auto mb-3 text-dark-600" />
            <p>No branches configured yet.</p>
            <p className="text-sm mt-1 text-dark-500">Click "Create Head Office" to set up your first branch.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Code</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Name</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Address</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Phone</th>
                <th className="text-center text-dark-400 font-medium py-3 px-4 text-sm">Status</th>
                <th className="text-right text-dark-400 font-medium py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="py-3 px-4">
                    <span className="font-mono text-primary-400 font-medium">{branch.code}</span>
                  </td>
                  <td className="py-3 px-4 text-dark-100">{branch.name}</td>
                  <td className="py-3 px-4 text-dark-400">{branch.address || '-'}</td>
                  <td className="py-3 px-4 text-dark-400">{branch.phone || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(branch)}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        branch.isActive
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-dark-700 text-dark-400'
                      }`}
                    >
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(branch._id)}
                        className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showAddModal || editingBranch) && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-50">
                {editingBranch ? 'Edit Branch' : 'Add Branch'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingBranch(null)
                  resetForm()
                }}
                className="text-dark-400 hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Branch Code (3 letters)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 3) })}
                  className="input font-mono"
                  placeholder="HOF"
                  maxLength={3}
                  disabled={!!editingBranch}
                />
              </div>
              <div>
                <label className="label">Branch Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Head Office"
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingBranch(null)
                  resetForm()
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingBranch ? handleEdit : handleAdd}
                className="btn-primary"
              >
                {editingBranch ? 'Save Changes' : 'Add Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="h-12 w-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Delete Branch?</h3>
              <p className="text-dark-400 text-sm">
                This action cannot be undone. Branches with existing transactions cannot be deleted.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface UserProfile {
  _id: Id<"userProfiles">
  userId: Id<"users">
  firstName: string
  lastName: string
  role: string
  branchId?: Id<"branches">
  userAlias?: string
  userPin?: string
  transactionLimitPerDay?: number
  enable2FA?: boolean
  isVerified?: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
  email?: string
  branchName?: string | null
  branchCode?: string | null
}

function UsersSection() {
  const users = useQuery(api.users.list)
  const branches = useQuery(api.branches.list)
  const createUser = useMutation(api.users.create)
  const updateUser = useMutation(api.users.update)
  const deleteUser = useMutation(api.users.remove)
  const toggleActive = useMutation(api.users.toggleActive)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"userProfiles"> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'teller',
    branchId: '' as string,
    userAlias: '',
    userPin: '',
    transactionLimitPerDay: '',
    enable2FA: false,
    isVerified: false,
  })

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'teller',
      branchId: '',
      userAlias: '',
      userPin: '',
      transactionLimitPerDay: '',
      enable2FA: false,
      isVerified: false,
    })
    setError(null)
  }

  const handleAdd = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First Name, Last Name, and Email are required')
      return
    }

    try {
      await createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        branchId: formData.branchId ? formData.branchId as Id<"branches"> : undefined,
        userAlias: formData.userAlias || undefined,
        userPin: formData.userPin || undefined,
        transactionLimitPerDay: formData.transactionLimitPerDay ? parseFloat(formData.transactionLimitPerDay) : undefined,
        enable2FA: formData.enable2FA,
        isVerified: formData.isVerified,
      })
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    }
  }

  const handleEdit = async () => {
    if (!editingUser || !formData.firstName || !formData.lastName) {
      setError('First Name and Last Name are required')
      return
    }

    try {
      await updateUser({
        id: editingUser._id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        branchId: formData.branchId ? formData.branchId as Id<"branches"> : undefined,
        userAlias: formData.userAlias || undefined,
        userPin: formData.userPin || undefined,
        transactionLimitPerDay: formData.transactionLimitPerDay ? parseFloat(formData.transactionLimitPerDay) : undefined,
        enable2FA: formData.enable2FA,
        isVerified: formData.isVerified,
      })
      setEditingUser(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDelete = async (id: Id<"userProfiles">) => {
    try {
      await deleteUser({ id })
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
      setDeleteConfirm(null)
    }
  }

  const handleToggleActive = async (user: UserProfile) => {
    await toggleActive({ id: user._id })
  }

  const openEditModal = (user: UserProfile) => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      role: user.role,
      branchId: user.branchId || '',
      userAlias: user.userAlias || '',
      userPin: user.userPin || '',
      transactionLimitPerDay: user.transactionLimitPerDay?.toString() || '',
      enable2FA: user.enable2FA || false,
      isVerified: user.isVerified || false,
    })
    setEditingUser(user)
    setError(null)
  }

  const roleOptions = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'teller', label: 'Teller' },
    { value: 'compliance', label: 'Compliance Officer' },
  ]

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-dark-100">Users</h2>
        <button
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card p-0">
        {!users ? (
          <div className="p-8 text-center text-dark-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-dark-600" />
            <p>No users configured yet.</p>
            <p className="text-sm mt-1 text-dark-500">Click "Add User" to create your first user account.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Name</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Email</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Role</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Branch</th>
                <th className="text-center text-dark-400 font-medium py-3 px-4 text-sm">Status</th>
                <th className="text-right text-dark-400 font-medium py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="py-3 px-4">
                    <div className="text-dark-100 font-medium">{user.firstName} {user.lastName}</div>
                    {user.userAlias && (
                      <div className="text-xs text-dark-500">Alias: {user.userAlias}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-dark-300">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      user.role === 'admin' ? 'bg-purple-900/30 text-purple-400' :
                      user.role === 'manager' ? 'bg-blue-900/30 text-blue-400' :
                      user.role === 'compliance' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-dark-700 text-dark-300'
                    }`}>
                      {roleOptions.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-dark-400">
                    {user.branchCode ? (
                      <span className="font-mono text-primary-400">{user.branchCode}</span>
                    ) : (
                      <span className="text-dark-500">Roaming</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(user as UserProfile)}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        user.isActive
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-dark-700 text-dark-400'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user as UserProfile)}
                        className="p-1.5 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user._id)}
                        className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-900">
              <h3 className="text-lg font-semibold text-dark-50">
                {editingUser ? 'Edit User' : 'Add User'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingUser(null)
                  resetForm()
                }}
                className="text-dark-400 hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="john@example.com"
                  disabled={!!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Branch (optional)</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="input"
                  >
                    <option value="">Roaming (All Branches)</option>
                    {branches?.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.code} - {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">User Alias (for receipts)</label>
                  <input
                    type="text"
                    value={formData.userAlias}
                    onChange={(e) => setFormData({ ...formData, userAlias: e.target.value })}
                    className="input"
                    placeholder="JD"
                  />
                </div>
                <div>
                  <label className="label">User PIN (for security)</label>
                  <input
                    type="password"
                    value={formData.userPin}
                    onChange={(e) => setFormData({ ...formData, userPin: e.target.value })}
                    className="input"
                    placeholder="****"
                    maxLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="label">Transaction Limit Per Day (optional)</label>
                <input
                  type="number"
                  value={formData.transactionLimitPerDay}
                  onChange={(e) => setFormData({ ...formData, transactionLimitPerDay: e.target.value })}
                  className="input"
                  placeholder="10000"
                />
                <p className="text-xs text-dark-500 mt-1">Leave blank for no limit</p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enable2FA}
                    onChange={(e) => setFormData({ ...formData, enable2FA: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-dark-200">Enable Two-Factor Authentication</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-dark-200">Is Verified (bypass email verification)</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingUser(null)
                  resetForm()
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? handleEdit : handleAdd}
                className="btn-primary"
              >
                {editingUser ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="h-12 w-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Delete User?</h3>
              <p className="text-dark-400 text-sm">
                This action cannot be undone. Users with existing transactions cannot be deleted.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface Lookup {
  _id: Id<"lookups">
  lookupKey: string
  lookupValue: string
  displayOrder?: number
  isActive: boolean
  createdAt: number
  updatedAt: number
}

const LOOKUP_KEY_OPTIONS = [
  { value: 'customer_group', label: 'Customer Group' },
  { value: 'payment_method', label: 'Payment Method' },
  { value: 'source_of_funds', label: 'Source of Funds' },
  { value: 'id_type', label: 'ID Type' },
  { value: 'transaction_purpose', label: 'Transaction Purpose' },
]

function LookupsSection() {
  const lookups = useQuery(api.lookups.list)
  const createLookup = useMutation(api.lookups.create)
  const updateLookup = useMutation(api.lookups.update)
  const deleteLookup = useMutation(api.lookups.remove)
  const seedDefaults = useMutation(api.lookups.seedDefaults)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLookup, setEditingLookup] = useState<Lookup | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"lookups"> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>('customer_group')

  const [formData, setFormData] = useState({
    lookupKey: 'customer_group',
    lookupValue: '',
    displayOrder: '',
  })

  const resetForm = () => {
    setFormData({
      lookupKey: selectedKey,
      lookupValue: '',
      displayOrder: '',
    })
    setError(null)
  }

  const handleAdd = async () => {
    if (!formData.lookupValue.trim()) {
      setError('Lookup Value is required')
      return
    }

    try {
      await createLookup({
        lookupKey: formData.lookupKey,
        lookupValue: formData.lookupValue.trim(),
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : undefined,
      })
      setShowAddModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lookup')
    }
  }

  const handleEdit = async () => {
    if (!editingLookup || !formData.lookupValue.trim()) {
      setError('Lookup Value is required')
      return
    }

    try {
      await updateLookup({
        id: editingLookup._id,
        lookupValue: formData.lookupValue.trim(),
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : undefined,
      })
      setEditingLookup(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lookup')
    }
  }

  const handleDelete = async (id: Id<"lookups">) => {
    try {
      await deleteLookup({ id })
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lookup')
      setDeleteConfirm(null)
    }
  }

  const handleToggleActive = async (lookup: Lookup) => {
    await updateLookup({
      id: lookup._id,
      isActive: !lookup.isActive,
    })
  }

  const openEditModal = (lookup: Lookup) => {
    setFormData({
      lookupKey: lookup.lookupKey,
      lookupValue: lookup.lookupValue,
      displayOrder: lookup.displayOrder?.toString() || '',
    })
    setEditingLookup(lookup)
    setError(null)
  }

  const handleSeedDefaults = async () => {
    await seedDefaults({})
  }

  const filteredLookups = lookups?.filter((l) => l.lookupKey === selectedKey) || []
  const sortedLookups = [...filteredLookups].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-dark-100">Lookups</h2>
        <div className="flex gap-2">
          {(!lookups || lookups.length === 0) && (
            <button
              onClick={handleSeedDefaults}
              className="btn-secondary"
            >
              Load Default Lookups
            </button>
          )}
          <button
            onClick={() => {
              resetForm()
              setFormData((prev) => ({ ...prev, lookupKey: selectedKey }))
              setShowAddModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Lookup
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="text-dark-300 text-sm">Lookup Key:</label>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="input w-64"
        >
          {LOOKUP_KEY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-0">
        {!lookups ? (
          <div className="p-8 text-center text-dark-400">Loading lookups...</div>
        ) : sortedLookups.length === 0 ? (
          <div className="p-8 text-center text-dark-400">
            <List className="h-12 w-12 mx-auto mb-3 text-dark-600" />
            <p>No values for "{LOOKUP_KEY_OPTIONS.find(o => o.value === selectedKey)?.label}".</p>
            <p className="text-sm mt-1 text-dark-500">Click "Add Lookup" to add a new value or "Load Default Lookups" to populate common values.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Order</th>
                <th className="text-left text-dark-400 font-medium py-3 px-4 text-sm">Value</th>
                <th className="text-center text-dark-400 font-medium py-3 px-4 text-sm">Status</th>
                <th className="text-right text-dark-400 font-medium py-3 px-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLookups.map((lookup) => (
                <tr key={lookup._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="py-3 px-4">
                    <span className="font-mono text-dark-400">{lookup.displayOrder ?? '-'}</span>
                  </td>
                  <td className="py-3 px-4 text-dark-100 font-medium">{lookup.lookupValue}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(lookup)}
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        lookup.isActive
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-dark-700 text-dark-400'
                      }`}
                    >
                      {lookup.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(lookup)}
                        className="p-1.5 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(lookup._id)}
                        className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showAddModal || editingLookup) && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-50">
                {editingLookup ? 'Edit Lookup' : 'Add Lookup'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingLookup(null)
                  resetForm()
                }}
                className="text-dark-400 hover:text-dark-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Lookup Key</label>
                <select
                  value={formData.lookupKey}
                  onChange={(e) => setFormData({ ...formData, lookupKey: e.target.value })}
                  className="input"
                  disabled={!!editingLookup}
                >
                  {LOOKUP_KEY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Lookup Value</label>
                <input
                  type="text"
                  value={formData.lookupValue}
                  onChange={(e) => setFormData({ ...formData, lookupValue: e.target.value })}
                  className="input"
                  placeholder="e.g., VIP, Regular, Tourist"
                />
              </div>
              <div>
                <label className="label">Display Order (optional)</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  className="input"
                  placeholder="1"
                  min="1"
                />
                <p className="text-xs text-dark-500 mt-1">Items are sorted by this number (lowest first)</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingLookup(null)
                  resetForm()
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={editingLookup ? handleEdit : handleAdd}
                className="btn-primary"
              >
                {editingLookup ? 'Save Changes' : 'Add Lookup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="h-12 w-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark-50 mb-2">Delete Lookup?</h3>
              <p className="text-dark-400 text-sm">
                This action cannot be undone. This lookup value will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-dark-700">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
