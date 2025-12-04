import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import {
  ArrowRightLeft,
  Calculator,
  Check,
  RefreshCw,
  User,
  Search,
  X,
} from "lucide-react"
import { Id } from "../../convex/_generated/dataModel"
import clsx from "clsx"

type TransactionType = "buy" | "sell"

interface ExchangeRate {
  targetCurrency: string
  buyRate: number
  sellRate: number
  spread: number
}

export function POSPage() {
  const currencies = useQuery(api.currencies.getActive) || []
  const rates = useQuery(api.exchangeRates.getCurrentRates, { baseCurrency: "USD" }) || []
  const defaultBranch = useQuery(api.branches.getDefaultBranch)
  const recentTransactions = useQuery(api.transactions.getRecent, { limit: 5 }) || []
  const customers = useQuery(api.customers.list, {}) || []

  const createTransaction = useMutation(api.transactions.create)
  const seedBranch = useMutation(api.branches.seedDefaultBranch)

  const [transactionType, setTransactionType] = useState<TransactionType>("buy")
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("EUR")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [customRate, setCustomRate] = useState("")
  const [useCustomRate, setUseCustomRate] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<{ number: string; type: string } | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Id<"customers"> | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (defaultBranch === null) {
      seedBranch()
    }
  }, [defaultBranch, seedBranch])

  const rateMap = new Map<string, ExchangeRate>()
  rates.forEach((rate) => {
    rateMap.set(rate.targetCurrency, rate as ExchangeRate)
  })

  const getCurrentRate = (): number => {
    if (useCustomRate && customRate) {
      return parseFloat(customRate)
    }

    if (transactionType === "buy") {
      if (fromCurrency === "USD") {
        const rate = rateMap.get(toCurrency)
        return rate ? rate.sellRate : 1
      } else {
        const rate = rateMap.get(fromCurrency)
        return rate ? 1 / rate.buyRate : 1
      }
    } else {
      if (toCurrency === "USD") {
        const rate = rateMap.get(fromCurrency)
        return rate ? rate.buyRate : 1
      } else {
        const rate = rateMap.get(toCurrency)
        return rate ? 1 / rate.sellRate : 1
      }
    }
  }

  const getDecimalPlaces = (code: string): number => {
    const currency = currencies.find((c) => c.code === code)
    return currency?.decimalPlaces ?? 2
  }

  const calculateToAmount = (amount: string) => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setToAmount("")
      return
    }
    const rate = getCurrentRate()
    const result = numAmount * rate
    const decimals = getDecimalPlaces(toCurrency)
    setToAmount(result.toFixed(decimals))
  }

  const calculateFromAmount = (amount: string) => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFromAmount("")
      return
    }
    const rate = getCurrentRate()
    const result = numAmount / rate
    const decimals = getDecimalPlaces(fromCurrency)
    setFromAmount(result.toFixed(decimals))
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    calculateToAmount(value)
  }

  const handleToAmountChange = (value: string) => {
    setToAmount(value)
    calculateFromAmount(value)
  }

  const handleSwapCurrencies = () => {
    const tempFrom = fromCurrency
    const tempTo = toCurrency
    setFromCurrency(tempTo)
    setToCurrency(tempFrom)
    setFromAmount(toAmount)
    calculateToAmount(toAmount)
  }

  const handleTransactionTypeChange = (type: TransactionType) => {
    setTransactionType(type)
    if (fromAmount) {
      calculateToAmount(fromAmount)
    }
  }

  useEffect(() => {
    if (fromAmount) {
      calculateToAmount(fromAmount)
    }
  }, [fromCurrency, toCurrency, useCustomRate, customRate])

  const handleSubmit = async () => {
    if (!defaultBranch || !fromAmount || !toAmount) return

    setIsProcessing(true)
    setErrorMessage(null)
    try {
      const result = await createTransaction({
        transactionType,
        branchId: defaultBranch._id,
        customerId: selectedCustomer || undefined,
        sourceCurrency: fromCurrency,
        targetCurrency: toCurrency,
        sourceAmount: parseFloat(fromAmount),
        targetAmount: parseFloat(toAmount),
        exchangeRate: getCurrentRate(),
      })

      setLastTransaction({
        number: result.transactionNumber,
        type: transactionType,
      })
      setShowSuccess(true)
      setFromAmount("")
      setToAmount("")
      setSelectedCustomer(null)
      setCustomerSearch("")

      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (error) {
      console.error("Transaction failed:", error)
      const errorMsg = error instanceof Error ? error.message : "Transaction failed"
      if (errorMsg.includes("SANCTION_BLOCKED")) {
        setErrorMessage("Transaction BLOCKED: Customer is on sanction list. Please contact compliance department.")
      } else if (errorMsg.includes("SUSPICIOUS_BLOCKED")) {
        setErrorMessage("Transaction BLOCKED: Customer is flagged as suspicious. Please contact compliance department.")
      } else {
        setErrorMessage(errorMsg)
      }
      setTimeout(() => {
        setErrorMessage(null)
      }, 8000)
    } finally {
      setIsProcessing(false)
    }
  }

  const getCurrencySymbol = (code: string): string => {
    const currency = currencies.find((c) => c.code === code)
    return currency?.symbol || code
  }

  const formatCurrency = (amount: number, code: string): string => {
    const symbol = getCurrencySymbol(code)
    const decimals = getDecimalPlaces(code)
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Point of Sale</h1>
          <p className="text-dark-400">Process currency exchange transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => handleTransactionTypeChange("buy")}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all",
                  transactionType === "buy"
                    ? "bg-green-600 text-white"
                    : "bg-dark-800 text-dark-300 hover:bg-dark-700"
                )}
              >
                We Buy (Customer Sells)
              </button>
              <button
                onClick={() => handleTransactionTypeChange("sell")}
                className={clsx(
                  "flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all",
                  transactionType === "sell"
                    ? "bg-red-600 text-white"
                    : "bg-dark-800 text-dark-300 hover:bg-dark-700"
                )}
              >
                We Sell (Customer Buys)
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Customer (Optional)
              </label>
              <div className="relative">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg border border-dark-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-dark-400" />
                      <span className="text-dark-200">
                        {customers.find(c => c._id === selectedCustomer)?.firstName}{" "}
                        {customers.find(c => c._id === selectedCustomer)?.lastName}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomerSearch("")
                      }}
                      className="p-1 text-dark-400 hover:text-dark-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerDropdown(true)
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search for customer..."
                      className="input pl-10 w-full"
                    />
                    {showCustomerDropdown && customerSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {customers
                          .filter(c =>
                            c.firstName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.lastName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .slice(0, 5)
                          .map(customer => (
                            <button
                              key={customer._id}
                              onClick={() => {
                                setSelectedCustomer(customer._id)
                                setCustomerSearch("")
                                setShowCustomerDropdown(false)
                              }}
                              className="w-full p-3 text-left hover:bg-dark-700 flex items-center gap-2"
                            >
                              <User className="h-4 w-4 text-dark-400" />
                              <div>
                                <p className="text-dark-200 text-sm">
                                  {customer.firstName} {customer.lastName}
                                </p>
                                {customer.email && (
                                  <p className="text-dark-500 text-xs">{customer.email}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        {customers.filter(c =>
                          c.firstName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.lastName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.email?.toLowerCase().includes(customerSearch.toLowerCase())
                        ).length === 0 && (
                          <p className="p-3 text-dark-400 text-sm">No customers found</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {transactionType === "buy" ? "Customer Gives" : "Amount to Exchange"}
                  </label>
                  <div className="flex">
                    <select
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value)}
                      className="input rounded-r-none border-r-0 w-28"
                    >
                      {currencies.map((c) => (
                        <option key={c._id} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => handleFromAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="input rounded-l-none flex-1 text-right text-xl font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSwapCurrencies}
                  className="p-3 rounded-full bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-colors mt-6"
                >
                  <ArrowRightLeft className="h-5 w-5" />
                </button>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {transactionType === "buy" ? "Customer Receives" : "Customer Gives"}
                  </label>
                  <div className="flex">
                    <select
                      value={toCurrency}
                      onChange={(e) => setToCurrency(e.target.value)}
                      className="input rounded-r-none border-r-0 w-28"
                    >
                      {currencies.map((c) => (
                        <option key={c._id} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={toAmount}
                      onChange={(e) => handleToAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="input rounded-l-none flex-1 text-right text-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-dark-400" />
                  <span className="text-dark-300">Exchange Rate:</span>
                  <span className="font-mono text-dark-100">
                    1 {fromCurrency} = {getCurrentRate().toFixed(4)} {toCurrency}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomRate}
                      onChange={(e) => setUseCustomRate(e.target.checked)}
                      className="rounded bg-dark-700 border-dark-600 text-primary-500 focus:ring-primary-500"
                    />
                    Custom Rate
                  </label>
                  {useCustomRate && (
                    <input
                      type="number"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      placeholder="Rate"
                      className="input w-24 text-sm"
                      step="0.0001"
                    />
                  )}
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="text-dark-300">
                    {transactionType === "buy" ? "Total to Pay Customer:" : "Total Due from Customer:"}
                  </span>
                  <span className="text-2xl font-bold text-dark-50">
                    {toAmount ? formatCurrency(parseFloat(toAmount), toCurrency) : `${getCurrencySymbol(toCurrency)}0.00`}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!fromAmount || !toAmount || isProcessing || !defaultBranch}
                className={clsx(
                  "w-full py-4 rounded-lg font-semibold text-lg transition-all",
                  transactionType === "buy"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white",
                  (!fromAmount || !toAmount || isProcessing) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Complete ${transactionType === "buy" ? "Buy" : "Sell"} Transaction`
                )}
              </button>
            </div>
          </div>

          {showSuccess && lastTransaction && (
            <div className="card p-4 bg-green-900/20 border-green-700">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-green-400">Transaction Completed</p>
                  <p className="text-sm text-dark-400">
                    {lastTransaction.type === "buy" ? "Buy" : "Sell"} transaction {lastTransaction.number} has been recorded.
                  </p>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="card p-4 bg-red-900/20 border-red-700">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
                  <X className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-400">Transaction Failed</p>
                  <p className="text-sm text-dark-400">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-dark-700 rounded">
                  <X className="h-4 w-4 text-dark-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Current Rates</h3>
            <div className="space-y-3">
              {rates.slice(0, 5).map((rate) => (
                <div
                  key={rate.targetCurrency}
                  className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                >
                  <span className="font-medium text-dark-200">{rate.targetCurrency}</span>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-green-400">{rate.buyRate.toFixed(4)}</span>
                      <span className="text-dark-500 mx-1">/</span>
                      <span className="text-red-400">{rate.sellRate.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">Recent Transactions</h3>
            {recentTransactions.length === 0 ? (
              <p className="text-dark-400 text-sm">No transactions today</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0"
                  >
                    <div>
                      <span
                        className={clsx(
                          "text-xs font-medium px-2 py-0.5 rounded",
                          tx.transactionType === "buy"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-red-900/50 text-red-400"
                        )}
                      >
                        {tx.transactionType.toUpperCase()}
                      </span>
                      <p className="text-sm text-dark-300 mt-1">
                        {tx.sourceCurrency} → {tx.targetCurrency}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-dark-100">
                        {tx.targetAmount.toFixed(getDecimalPlaces(tx.targetCurrency))} {tx.targetCurrency}
                      </p>
                      <p className="text-xs text-dark-500">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
