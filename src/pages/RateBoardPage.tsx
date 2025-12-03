import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { DollarSign, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  ZAR: '🇿🇦',
  TRY: '🇹🇷',
  AED: '🇦🇪',
  SAR: '🇸🇦',
}

export function RateBoardPage() {
  const currencies = useQuery(api.currencies.getActivePublic)
  const rates = useQuery(api.exchangeRates.getCurrentRatesPublic, { baseCurrency: 'USD' })
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const getRateForCurrency = (currency: NonNullable<typeof currencies>[0]) => {
    const targetKey = currency.alias || currency.code
    return rates?.find(r => r.targetCurrency === targetKey)
  }

  const standardCurrencies = currencies?.filter(c => !c.alias && c.code !== 'USD') || []
  const vipCurrencies = currencies?.filter(c => c.alias) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <DollarSign className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">OpenCX</h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-300">Exchange Rates</h2>
          <p className="text-slate-500 mt-2 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="card mb-8">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span className="text-2xl">💱</span>
            Standard Rates
          </h3>

          {!currencies || !rates ? (
            <div className="text-slate-400 text-center py-8">Loading rates...</div>
          ) : standardCurrencies.length === 0 ? (
            <div className="text-slate-400 text-center py-8">No rates available</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="text-left text-slate-300 font-semibold py-4 px-6">Currency</th>
                    <th className="text-right text-green-400 font-semibold py-4 px-6">We Buy</th>
                    <th className="text-right text-red-400 font-semibold py-4 px-6">We Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {standardCurrencies.map((currency, idx) => {
                    const rate = getRateForCurrency(currency)
                    return (
                      <tr
                        key={currency._id}
                        className={`border-t border-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-800/20' : ''} hover:bg-slate-800/40 transition-colors`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {currency.flagEmoji || CURRENCY_FLAGS[currency.code] || '💱'}
                            </span>
                            <div>
                              <span className="font-mono text-xl font-bold text-white">{currency.code}</span>
                              <p className="text-slate-400 text-sm">{currency.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-2xl font-mono font-bold text-green-400">
                            {rate ? rate.buyRate.toFixed(4) : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-2xl font-mono font-bold text-red-400">
                            {rate ? rate.sellRate.toFixed(4) : '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {vipCurrencies.length > 0 && (
          <div className="card">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              VIP Rates
              <span className="text-sm font-normal text-purple-400 bg-purple-500/20 px-2 py-1 rounded ml-2">
                Better rates for VIP customers
              </span>
            </h3>

            <div className="overflow-hidden rounded-lg border border-purple-500/30">
              <table className="w-full">
                <thead className="bg-purple-900/30">
                  <tr>
                    <th className="text-left text-slate-300 font-semibold py-4 px-6">Currency</th>
                    <th className="text-left text-purple-400 font-semibold py-4 px-6">Tier</th>
                    <th className="text-right text-green-400 font-semibold py-4 px-6">We Buy</th>
                    <th className="text-right text-red-400 font-semibold py-4 px-6">We Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {vipCurrencies.map((currency, idx) => {
                    const rate = getRateForCurrency(currency)
                    return (
                      <tr
                        key={currency._id}
                        className={`border-t border-purple-500/20 ${idx % 2 === 0 ? 'bg-purple-900/10' : ''} hover:bg-purple-900/20 transition-colors`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {currency.flagEmoji || CURRENCY_FLAGS[currency.code] || '💱'}
                            </span>
                            <div>
                              <span className="font-mono text-xl font-bold text-white">{currency.code}</span>
                              <p className="text-slate-400 text-sm">{currency.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-purple-500/30 text-purple-300 rounded-full text-sm font-medium">
                            {currency.alias}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-2xl font-mono font-bold text-green-400">
                            {rate ? rate.buyRate.toFixed(4) : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-2xl font-mono font-bold text-red-400">
                            {rate ? rate.sellRate.toFixed(4) : '-'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>Rates are subject to change without notice. Contact us for current rates on large transactions.</p>
          <p className="mt-2">Powered by OpenCX - Currency Exchange Management System</p>
        </div>
      </div>
    </div>
  )
}
