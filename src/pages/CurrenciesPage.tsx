import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  X,
  Check,
  RefreshCw,
  AlertCircle,
  Globe,
  Building2,
} from 'lucide-react'

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  CAD: '🇨🇦',
  JPY: '🇯🇵',
  CHF: '🇨🇭',
  AUD: '🇦🇺',
  MXN: '🇲🇽',
  PLN: '🇵🇱',
  CNY: '🇨🇳',
  INR: '🇮🇳',
  BRL: '🇧🇷',
  KRW: '🇰🇷',
  SGD: '🇸🇬',
  HKD: '🇭🇰',
  NZD: '🇳🇿',
  SEK: '🇸🇪',
  NOK: '🇳🇴',
  DKK: '🇩🇰',
  RUB: '🇷🇺',
  ZAR: '🇿🇦',
  TRY: '🇹🇷',
  AED: '🇦🇪',
  SAR: '🇸🇦',
  PHP: '🇵🇭',
  THB: '🇹🇭',
  MYR: '🇲🇾',
  IDR: '🇮🇩',
  VND: '🇻🇳',
  COP: '🇨🇴',
  CLP: '🇨🇱',
  ARS: '🇦🇷',
  PEN: '🇵🇪',
}

interface CurrencyFormData {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  alias: string
  markupPercent: string
  markdownPercent: string
  branchIds: Id<"branches">[]
}

interface RateFormData {
  targetCurrency: string
  buyRate: string
  sellRate: string
}

export function CurrenciesPage() {
  const currencies = useQuery(api.currencies.list)
  const currentRates = useQuery(api.exchangeRates.getCurrentRates, { baseCurrency: "USD" })
  const branches = useQuery(api.branches.list)

  const createCurrency = useMutation(api.currencies.create)
  const updateCurrency = useMutation(api.currencies.update)
  const deleteCurrency = useMutation(api.currencies.remove)
  const seedCurrencies = useMutation(api.currencies.seedDefaultCurrencies)
  const setRate = useMutation(api.exchangeRates.setRate)
  const seedRates = useMutation(api.exchangeRates.seedDefaultRates)
  const fetchLiveRate = useAction(api.currencies.fetchLiveRate)
  const applyLiveRate = useAction(api.currencies.applyLiveRate)

  const [showCurrencyModal, setShowCurrencyModal] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Id<"currencies"> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchingRate, setFetchingRate] = useState<string | null>(null)

  const [currencyForm, setCurrencyForm] = useState<CurrencyFormData>({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: 2,
    alias: '',
    markupPercent: '2',
    markdownPercent: '2',
    branchIds: [],
  })

  const [rateForm, setRateForm] = useState<RateFormData>({
    targetCurrency: '',
    buyRate: '',
    sellRate: '',
  })

  const resetCurrencyForm = () => {
    setCurrencyForm({
      code: '',
      name: '',
      symbol: '',
      decimalPlaces: 2,
      alias: '',
      markupPercent: '2',
      markdownPercent: '2',
      branchIds: [],
    })
    setEditingCurrency(null)
    setError(null)
  }

  const resetRateForm = () => {
    setRateForm({ targetCurrency: '', buyRate: '', sellRate: '' })
    setError(null)
  }

  const handleSeedCurrencies = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await seedCurrencies()
      setSuccess('Default currencies seeded successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seed currencies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeedRates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await seedRates()
      setSuccess('Default exchange rates seeded successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to seed rates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFetchLiveRate = async (currency: NonNullable<typeof currencies>[0]) => {
    setFetchingRate(currency.code)
    setError(null)
    try {
      const result = await applyLiveRate({
        baseCurrency: 'USD',
        targetCurrency: currency.code,
        markupPercent: currency.markupPercent || 2,
        markdownPercent: currency.markdownPercent || 2,
      })
      setSuccess(`Live rate applied for ${currency.code}: Buy ${result.buyRate.toFixed(4)}, Sell ${result.sellRate.toFixed(4)}`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch live rate')
    } finally {
      setFetchingRate(null)
    }
  }

  const handleCurrencySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const data = {
        code: currencyForm.code,
        name: currencyForm.name,
        symbol: currencyForm.symbol,
        decimalPlaces: currencyForm.decimalPlaces,
        alias: currencyForm.alias || undefined,
        markupPercent: parseFloat(currencyForm.markupPercent) || 0,
        markdownPercent: parseFloat(currencyForm.markdownPercent) || 0,
        branchIds: currencyForm.branchIds.length > 0 ? currencyForm.branchIds : undefined,
        flagEmoji: CURRENCY_FLAGS[currencyForm.code.toUpperCase()] || undefined,
      }

      if (editingCurrency) {
        await updateCurrency({
          id: editingCurrency,
          name: data.name,
          symbol: data.symbol,
          decimalPlaces: data.decimalPlaces,
          alias: data.alias,
          markupPercent: data.markupPercent,
          markdownPercent: data.markdownPercent,
          branchIds: data.branchIds,
          flagEmoji: data.flagEmoji,
        })
        setSuccess('Currency updated successfully')
      } else {
        await createCurrency(data)
        setSuccess('Currency created successfully')
      }
      setShowCurrencyModal(false)
      resetCurrencyForm()
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save currency')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await setRate({
        baseCurrency: 'USD',
        targetCurrency: rateForm.targetCurrency,
        buyRate: parseFloat(rateForm.buyRate),
        sellRate: parseFloat(rateForm.sellRate),
        source: 'manual',
      })
      setShowRateModal(false)
      resetRateForm()
      setSuccess('Exchange rate set successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set rate')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCurrency = (currency: NonNullable<typeof currencies>[0]) => {
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimalPlaces: currency.decimalPlaces,
      alias: currency.alias || '',
      markupPercent: String(currency.markupPercent || 2),
      markdownPercent: String(currency.markdownPercent || 2),
      branchIds: currency.branchIds || [],
    })
    setEditingCurrency(currency._id)
    setShowCurrencyModal(true)
  }

  const handleDeleteCurrency = async (id: Id<"currencies">) => {
    if (!confirm('Are you sure you want to delete this currency?')) return
    setIsLoading(true)
    setError(null)
    try {
      await deleteCurrency({ id })
      setSuccess('Currency deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete currency')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCurrency = async (currency: NonNullable<typeof currencies>[0]) => {
    setIsLoading(true)
    setError(null)
    try {
      await updateCurrency({
        id: currency._id,
        isActive: !currency.isActive,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update currency')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBranchToggle = (branchId: Id<"branches">) => {
    setCurrencyForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId],
    }))
  }

  const getRateForCurrency = (code: string) => {
    return currentRates?.find(r => r.targetCurrency === code)
  }

  const getBranchNames = (branchIds: Id<"branches">[] | undefined) => {
    if (!branchIds || branchIds.length === 0) return 'All Branches'
    return branchIds.map(id => branches?.find(b => b._id === id)?.name || '').filter(Boolean).join(', ') || 'All Branches'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Currency Grid</h1>
          <p className="text-slate-400 mt-1">Manage currencies, rates, and margins</p>
        </div>
        <div className="flex gap-3">
          {(!currencies || currencies.length === 0) && (
            <button
              onClick={handleSeedCurrencies}
              disabled={isLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Load Default Currencies
            </button>
          )}
          {currencies && currencies.length > 0 && (!currentRates || currentRates.length === 0) && (
            <button
              onClick={handleSeedRates}
              disabled={isLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Load Default Rates
            </button>
          )}
          <button
            onClick={() => {
              resetCurrencyForm()
              setShowCurrencyModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Currency
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-medium text-white">Currency Configuration</h2>
          <span className="text-sm text-slate-400 ml-auto">Base Currency: USD</span>
        </div>

        {!currencies ? (
          <div className="text-slate-400 text-center py-8">Loading currencies...</div>
        ) : currencies.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No currencies configured yet.</p>
            <p className="text-sm mt-1">Click "Load Default Currencies" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Currency</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Alias</th>
                  <th className="text-center text-slate-400 font-medium py-3 px-4">Markup %</th>
                  <th className="text-center text-slate-400 font-medium py-3 px-4">Markdown %</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Buy Rate</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Sell Rate</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Branches</th>
                  <th className="text-center text-slate-400 font-medium py-3 px-4">Status</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => {
                  const rate = getRateForCurrency(currency.code)
                  return (
                    <tr key={currency._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{currency.flagEmoji || CURRENCY_FLAGS[currency.code] || '💱'}</span>
                          <div>
                            <span className="font-mono text-white font-medium">{currency.code}</span>
                            <p className="text-slate-400 text-sm">{currency.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {currency.alias || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-amber-400 font-mono">{currency.markupPercent || 0}%</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-cyan-400 font-mono">{currency.markdownPercent || 0}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-green-400 font-mono">
                          {rate ? rate.buyRate.toFixed(4) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-red-400 font-mono">
                          {rate ? rate.sellRate.toFixed(4) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-300 text-sm">
                          {getBranchNames(currency.branchIds)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleCurrency(currency)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            currency.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {currency.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          {currency.code !== 'USD' && (
                            <button
                              onClick={() => handleFetchLiveRate(currency)}
                              disabled={fetchingRate === currency.code}
                              className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded"
                              title="Get Live Rate"
                            >
                              <Globe className={`w-4 h-4 ${fetchingRate === currency.code ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditCurrency(currency)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCurrency(currency._id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCurrencyModal && (
        <div className="modal-overlay">
          <div className="modal max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">
                {editingCurrency ? 'Edit Currency' : 'Add Currency'}
              </h3>
              <button
                onClick={() => {
                  setShowCurrencyModal(false)
                  resetCurrencyForm()
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCurrencySubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Currency Code *
                  </label>
                  <input
                    type="text"
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                    placeholder="PLN"
                    maxLength={3}
                    disabled={!!editingCurrency}
                    className="input w-full uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Currency Alias
                  </label>
                  <input
                    type="text"
                    value={currencyForm.alias}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, alias: e.target.value })}
                    placeholder="EUR-VIP"
                    className="input w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional: For tiered rates</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={currencyForm.name}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                  placeholder="Polish Zloty"
                  className="input w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    placeholder="zł"
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Decimal Places
                  </label>
                  <input
                    type="number"
                    value={currencyForm.decimalPlaces}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, decimalPlaces: parseInt(e.target.value) })}
                    min={0}
                    max={4}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Rate Margins
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Markup % (Sell)
                    </label>
                    <input
                      type="number"
                      value={currencyForm.markupPercent}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, markupPercent: e.target.value })}
                      placeholder="2"
                      step="0.1"
                      min="0"
                      className="input w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">Added to mid-rate when selling</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Markdown % (Buy)
                    </label>
                    <input
                      type="number"
                      value={currencyForm.markdownPercent}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, markdownPercent: e.target.value })}
                      placeholder="2"
                      step="0.1"
                      min="0"
                      className="input w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">Deducted from mid-rate when buying</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Branch Availability
                </h4>
                {branches && branches.length > 0 ? (
                  <div className="space-y-2">
                    {branches.filter(b => b.isActive).map((branch) => (
                      <label key={branch._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currencyForm.branchIds.includes(branch._id)}
                          onChange={() => handleBranchToggle(branch._id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-slate-300">{branch.name}</span>
                        <span className="text-slate-500 text-xs">({branch.code})</span>
                      </label>
                    ))}
                    <p className="text-xs text-slate-500 mt-2">
                      Leave unchecked for all branches
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No branches configured yet.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCurrencyModal(false)
                    resetCurrencyForm()
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {editingCurrency ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">Set Exchange Rate</h3>
              <button
                onClick={() => {
                  setShowRateModal(false)
                  resetRateForm()
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Base Currency
                </label>
                <input
                  type="text"
                  value="USD"
                  disabled
                  className="input w-full bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Target Currency
                </label>
                <select
                  value={rateForm.targetCurrency}
                  onChange={(e) => setRateForm({ ...rateForm, targetCurrency: e.target.value })}
                  className="input w-full"
                  required
                >
                  <option value="">Select currency</option>
                  {currencies?.filter(c => c.code !== 'USD' && c.isActive).map((currency) => (
                    <option key={currency._id} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Buy Rate
                  </label>
                  <input
                    type="number"
                    value={rateForm.buyRate}
                    onChange={(e) => setRateForm({ ...rateForm, buyRate: e.target.value })}
                    placeholder="0.0000"
                    step="0.0001"
                    min="0"
                    className="input w-full"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Rate when buying {rateForm.targetCurrency || 'currency'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Sell Rate
                  </label>
                  <input
                    type="number"
                    value={rateForm.sellRate}
                    onChange={(e) => setRateForm({ ...rateForm, sellRate: e.target.value })}
                    placeholder="0.0000"
                    step="0.0001"
                    min="0"
                    className="input w-full"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Rate when selling {rateForm.targetCurrency || 'currency'}</p>
                </div>
              </div>

              {rateForm.buyRate && rateForm.sellRate && (
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Spread:</span>
                    <span className="text-white font-mono">
                      {(((parseFloat(rateForm.sellRate) - parseFloat(rateForm.buyRate)) /
                        ((parseFloat(rateForm.buyRate) + parseFloat(rateForm.sellRate)) / 2)) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRateModal(false)
                    resetRateForm()
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Set Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
