import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  BookOpen,
  Layers,
  Calculator,
  LogIn,
  LogOut,
  Banknote,
  Download,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'

type Tab = 'main-accounts' | 'accounts' | 'tills'

const ACCOUNT_TYPES = [
  { value: 'assets', label: 'Assets' },
  { value: 'liabilities', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expenses', label: 'Expenses' },
]

function MainAccountsSection() {
  const accounts = useQuery(api.mainAccounts.list)
  const createAccount = useMutation(api.mainAccounts.create)
  const updateAccount = useMutation(api.mainAccounts.update)
  const deleteAccount = useMutation(api.mainAccounts.remove)
  const seedDefaults = useMutation(api.mainAccounts.seedDefaults)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<typeof accounts extends (infer T)[] | undefined ? T : never>(null)
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'assets',
    description: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"mainAccounts"> | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const openAddModal = () => {
    setFormData({ accountCode: '', accountName: '', accountType: 'assets', description: '' })
    setEditingAccount(null)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (account: NonNullable<typeof accounts>[number]) => {
    setFormData({
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      description: account.description || '',
    })
    setEditingAccount(account)
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (editingAccount) {
        await updateAccount({
          id: editingAccount._id,
          ...formData,
          description: formData.description || undefined,
          isActive: editingAccount.isActive,
        })
        setSuccess('Main account updated successfully')
      } else {
        await createAccount({
          ...formData,
          description: formData.description || undefined,
        })
        setSuccess('Main account created successfully')
      }
      setIsModalOpen(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDelete = async (id: Id<"mainAccounts">) => {
    try {
      await deleteAccount({ id })
      setDeleteConfirm(null)
      setSuccess('Main account deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setDeleteConfirm(null)
    }
  }

  const handleSeedDefaults = async () => {
    try {
      const result = await seedDefaults({})
      setSuccess(result.message)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'assets': return 'bg-green-500/20 text-green-400'
      case 'liabilities': return 'bg-red-500/20 text-red-400'
      case 'equity': return 'bg-blue-500/20 text-blue-400'
      case 'revenue': return 'bg-purple-500/20 text-purple-400'
      case 'expenses': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-dark-600 text-dark-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-dark-100">Main Accounts</h2>
          <p className="text-sm text-dark-400">High-level parent accounts for the Chart of Accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefaults}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Load Defaults
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Main Account
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Code</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Type</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Description</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.map((account) => (
              <tr key={account._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                <td className="py-3 px-4 text-dark-100 font-mono">{account.accountCode}</td>
                <td className="py-3 px-4 text-dark-100">{account.accountName}</td>
                <td className="py-3 px-4">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium capitalize', getTypeBadgeClass(account.accountType))}>
                    {account.accountType}
                  </span>
                </td>
                <td className="py-3 px-4 text-dark-400 text-sm">{account.description || '-'}</td>
                <td className="py-3 px-4">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    account.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-600 text-dark-400'
                  )}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(account)}
                      className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(account._id)}
                      className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-dark-400">
                  No main accounts found. Click "Load Defaults" to create standard accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-100">
                {editingAccount ? 'Edit Main Account' : 'Add Main Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-dark-400 hover:text-dark-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Account Code</label>
                <input
                  type="text"
                  value={formData.accountCode}
                  onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                  className="input"
                  placeholder="e.g., 1000"
                  required
                />
              </div>
              <div>
                <label className="label">Account Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="input"
                  placeholder="e.g., Assets"
                  required
                />
              </div>
              <div>
                <label className="label">Account Type</label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                  className="input"
                  required
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Delete Main Account</h3>
            <p className="text-dark-400 mb-6">Are you sure you want to delete this main account? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountsSection() {
  const accounts = useQuery(api.accounts.list)
  const mainAccounts = useQuery(api.mainAccounts.listActive)
  const branches = useQuery(api.branches.list)
  const currencies = useQuery(api.currencies.list)
  const tills = useQuery(api.tills.listActive)

  const createAccount = useMutation(api.accounts.create)
  const updateAccount = useMutation(api.accounts.update)
  const deleteAccount = useMutation(api.accounts.remove)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<typeof accounts extends (infer T)[] | undefined ? T : never>(null)
  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    mainAccountId: '' as string,
    currency: 'USD',
    branchId: '' as string,
    isBank: false,
    isCash: false,
    displayInInvoice: false,
    tillId: '' as string,
    description: '',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"ledgerAccounts"> | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const openAddModal = () => {
    setFormData({
      accountCode: '',
      accountName: '',
      mainAccountId: mainAccounts?.[0]?._id || '',
      currency: 'USD',
      branchId: '',
      isBank: false,
      isCash: false,
      displayInInvoice: false,
      tillId: '',
      description: '',
    })
    setEditingAccount(null)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (account: NonNullable<typeof accounts>[number]) => {
    setFormData({
      accountCode: account.accountCode,
      accountName: account.accountName,
      mainAccountId: account.mainAccountId,
      currency: account.currency,
      branchId: account.branchId || '',
      isBank: account.isBank || false,
      isCash: account.isCash || false,
      displayInInvoice: account.displayInInvoice || false,
      tillId: account.tillId || '',
      description: account.description || '',
    })
    setEditingAccount(account)
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.mainAccountId) {
      setError('Please select a main account')
      return
    }

    try {
      if (editingAccount) {
        await updateAccount({
          id: editingAccount._id,
          accountCode: formData.accountCode,
          accountName: formData.accountName,
          mainAccountId: formData.mainAccountId as Id<"mainAccounts">,
          currency: formData.currency,
          branchId: formData.branchId ? formData.branchId as Id<"branches"> : undefined,
          isBank: formData.isBank,
          isCash: formData.isCash,
          displayInInvoice: formData.displayInInvoice,
          tillId: formData.tillId ? formData.tillId as Id<"tills"> : undefined,
          description: formData.description || undefined,
          isActive: editingAccount.isActive,
        })
        setSuccess('Account updated successfully')
      } else {
        await createAccount({
          accountCode: formData.accountCode,
          accountName: formData.accountName,
          mainAccountId: formData.mainAccountId as Id<"mainAccounts">,
          currency: formData.currency,
          branchId: formData.branchId ? formData.branchId as Id<"branches"> : undefined,
          isBank: formData.isBank,
          isCash: formData.isCash,
          displayInInvoice: formData.displayInInvoice,
          tillId: formData.tillId ? formData.tillId as Id<"tills"> : undefined,
          description: formData.description || undefined,
        })
        setSuccess('Account created successfully')
      }
      setIsModalOpen(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDelete = async (id: Id<"ledgerAccounts">) => {
    try {
      await deleteAccount({ id })
      setDeleteConfirm(null)
      setSuccess('Account deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-dark-100">Sub-Ledger Accounts</h2>
          <p className="text-sm text-dark-400">Transaction accounts linked to main accounts</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Code</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Main Account</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Currency</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Branch</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Flags</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.map((account) => (
              <tr key={account._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                <td className="py-3 px-4 text-dark-100 font-mono">{account.accountCode}</td>
                <td className="py-3 px-4 text-dark-100">{account.accountName}</td>
                <td className="py-3 px-4 text-dark-300">{account.mainAccount?.accountName || '-'}</td>
                <td className="py-3 px-4 text-dark-300">{account.currency}</td>
                <td className="py-3 px-4 text-dark-300">{account.branch?.name || 'All'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    {account.isBank && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Bank</span>
                    )}
                    {account.isCash && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Cash</span>
                    )}
                    {account.displayInInvoice && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">Invoice</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    account.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-600 text-dark-400'
                  )}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(account)}
                      className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(account._id)}
                      className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accounts?.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-dark-400">
                  No accounts found. Create main accounts first, then add sub-ledger accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-900">
              <h3 className="text-lg font-semibold text-dark-100">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-dark-400 hover:text-dark-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Account Code</label>
                  <input
                    type="text"
                    value={formData.accountCode}
                    onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                    className="input"
                    placeholder="e.g., 1001"
                    required
                  />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                    required
                  >
                    {currencies?.filter(c => c.isActive).map((curr) => (
                      <option key={curr._id} value={curr.code}>{curr.code} - {curr.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Account Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="input"
                  placeholder="e.g., Cash on Hand - USD"
                  required
                />
              </div>
              <div>
                <label className="label">Main Account</label>
                <select
                  value={formData.mainAccountId}
                  onChange={(e) => setFormData({ ...formData, mainAccountId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Main Account</option>
                  {mainAccounts?.map((ma) => (
                    <option key={ma._id} value={ma._id}>{ma.accountCode} - {ma.accountName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Branch</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="input"
                >
                  <option value="">All Branches</option>
                  {branches?.filter(b => b.isActive).map((branch) => (
                    <option key={branch._id} value={branch._id}>{branch.code} - {branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Till (optional)</label>
                <select
                  value={formData.tillId}
                  onChange={(e) => setFormData({ ...formData, tillId: e.target.value })}
                  className="input"
                >
                  <option value="">No Till</option>
                  {tills?.map((till) => (
                    <option key={till._id} value={till._id}>{till.tillId} - {till.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Account Flags</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-dark-300">
                    <input
                      type="checkbox"
                      checked={formData.isBank}
                      onChange={(e) => setFormData({ ...formData, isBank: e.target.checked })}
                      className="rounded bg-dark-700 border-dark-600 text-primary-500"
                    />
                    Is Bank Account
                  </label>
                  <label className="flex items-center gap-2 text-dark-300">
                    <input
                      type="checkbox"
                      checked={formData.isCash}
                      onChange={(e) => setFormData({ ...formData, isCash: e.target.checked })}
                      className="rounded bg-dark-700 border-dark-600 text-primary-500"
                    />
                    Is Cash Account
                  </label>
                  <label className="flex items-center gap-2 text-dark-300">
                    <input
                      type="checkbox"
                      checked={formData.displayInInvoice}
                      onChange={(e) => setFormData({ ...formData, displayInInvoice: e.target.checked })}
                      className="rounded bg-dark-700 border-dark-600 text-primary-500"
                    />
                    Display in Invoice Dropdown
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Delete Account</h3>
            <p className="text-dark-400 mb-6">Are you sure you want to delete this account? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TillsSection() {
  const tillsData = useQuery(api.tills.list)
  const branches = useQuery(api.branches.list)

  const createTill = useMutation(api.tills.create)
  const updateTill = useMutation(api.tills.update)
  const deleteTill = useMutation(api.tills.remove)
  const signIn = useMutation(api.tills.signIn)
  const signOutTill = useMutation(api.tills.signOut)
  const createCashAccounts = useMutation(api.tills.createCashAccounts)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTill, setEditingTill] = useState<typeof tillsData extends (infer T)[] | undefined ? T : never>(null)
  const [formData, setFormData] = useState({
    tillId: '',
    name: '',
    branchId: '' as string,
    autoCreateCashAccounts: true,
  })
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"tills"> | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const openAddModal = () => {
    setFormData({
      tillId: '',
      name: '',
      branchId: branches?.[0]?._id || '',
      autoCreateCashAccounts: true,
    })
    setEditingTill(null)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (till: NonNullable<typeof tillsData>[number]) => {
    setFormData({
      tillId: till.tillId,
      name: till.name,
      branchId: till.branchId,
      autoCreateCashAccounts: till.autoCreateCashAccounts,
    })
    setEditingTill(till)
    setError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.branchId) {
      setError('Please select a branch')
      return
    }

    try {
      if (editingTill) {
        await updateTill({
          id: editingTill._id,
          tillId: formData.tillId,
          name: formData.name,
          branchId: formData.branchId as Id<"branches">,
          autoCreateCashAccounts: formData.autoCreateCashAccounts,
          isActive: editingTill.isActive,
        })
        setSuccess('Till updated successfully')
      } else {
        await createTill({
          tillId: formData.tillId,
          name: formData.name,
          branchId: formData.branchId as Id<"branches">,
          autoCreateCashAccounts: formData.autoCreateCashAccounts,
        })
        setSuccess('Till created successfully')
      }
      setIsModalOpen(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleDelete = async (id: Id<"tills">) => {
    try {
      await deleteTill({ id })
      setDeleteConfirm(null)
      setSuccess('Till deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setDeleteConfirm(null)
    }
  }

  const handleSignIn = async (id: Id<"tills">) => {
    try {
      await signIn({ id })
      setSuccess('Signed in to till successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleSignOut = async (id: Id<"tills">) => {
    try {
      await signOutTill({ id })
      setSuccess('Signed out of till successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleCreateCashAccounts = async (id: Id<"tills">) => {
    try {
      const result = await createCashAccounts({ id })
      setSuccess(result.message)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-dark-100">Tills (Cash Registers)</h2>
          <p className="text-sm text-dark-400">Manage physical or digital cash registers</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Till
        </button>
      </div>

      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Till ID</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Branch</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Signed In User</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tillsData?.map((till) => (
              <tr key={till._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                <td className="py-3 px-4 text-dark-100 font-mono">{till.tillId}</td>
                <td className="py-3 px-4 text-dark-100">{till.name}</td>
                <td className="py-3 px-4 text-dark-300">{till.branch?.name || '-'}</td>
                <td className="py-3 px-4">
                  {till.signedInUser ? (
                    <span className="text-green-400">{till.signedInUser.email}</span>
                  ) : (
                    <span className="text-dark-500">Not signed in</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={clsx(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    till.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-600 text-dark-400'
                  )}>
                    {till.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {till.signedInUserId ? (
                      <button
                        onClick={() => handleSignOut(till._id)}
                        className="p-1.5 text-dark-400 hover:text-orange-400 hover:bg-dark-700 rounded-lg transition-colors"
                        title="Sign Out"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSignIn(till._id)}
                        className="p-1.5 text-dark-400 hover:text-green-400 hover:bg-dark-700 rounded-lg transition-colors"
                        title="Sign In"
                      >
                        <LogIn className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCreateCashAccounts(till._id)}
                      className="p-1.5 text-dark-400 hover:text-blue-400 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Create Cash Accounts"
                    >
                      <Banknote className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(till)}
                      className="p-1.5 text-dark-400 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(till._id)}
                      className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tillsData?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-dark-400">
                  No tills found. Click "Add Till" to create a cash register.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-dark-100">
                {editingTill ? 'Edit Till' : 'Add Till'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-dark-400 hover:text-dark-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Till ID</label>
                <input
                  type="text"
                  value={formData.tillId}
                  onChange={(e) => setFormData({ ...formData, tillId: e.target.value })}
                  className="input"
                  placeholder="e.g., TILL001"
                  required
                />
              </div>
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Main Counter Till"
                  required
                />
              </div>
              <div>
                <label className="label">Branch</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches?.filter(b => b.isActive).map((branch) => (
                    <option key={branch._id} value={branch._id}>{branch.code} - {branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-dark-300">
                  <input
                    type="checkbox"
                    checked={formData.autoCreateCashAccounts}
                    onChange={(e) => setFormData({ ...formData, autoCreateCashAccounts: e.target.checked })}
                    className="rounded bg-dark-700 border-dark-600 text-primary-500"
                  />
                  Auto create cash accounts for all currencies
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingTill ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Delete Till</h3>
            <p className="text-dark-400 mb-6">Are you sure you want to delete this till? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ModulesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') || 'main-accounts') as Tab

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab })
  }

  const tabs = [
    { id: 'main-accounts' as Tab, name: 'Main Accounts', icon: BookOpen },
    { id: 'accounts' as Tab, name: 'Accounts', icon: Layers },
    { id: 'tills' as Tab, name: 'Tills', icon: Calculator },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Modules</h1>
        <p className="text-dark-400">Chart of Accounts and Till Management</p>
      </div>

      <div className="border-b border-dark-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-dark-400 hover:text-dark-200'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'main-accounts' && <MainAccountsSection />}
      {activeTab === 'accounts' && <AccountsSection />}
      {activeTab === 'tills' && <TillsSection />}
    </div>
  )
}
