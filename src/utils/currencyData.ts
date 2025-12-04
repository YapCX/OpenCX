import * as ct from 'countries-and-timezones'
import countryToCurrency from 'country-to-currency'
import cc from 'currency-codes'

// Get all countries sorted by name
const allCountries = ct.getAllCountries()
export const COUNTRIES = Object.values(allCountries)
  .map((c: ct.Country) => ({ code: c.id, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

// Common currencies for exchange businesses
const COMMON_CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY',
  'HKD', 'SGD', 'AED', 'MXN', 'BRL', 'INR', 'ZAR', 'NZD',
  'SEK', 'NOK', 'DKK', 'KRW', 'THB', 'MYR', 'PHP', 'IDR',
  'PLN', 'TRY', 'RUB', 'SAR', 'COP', 'CLP', 'ARS', 'PEN', 'VND'
]

export const CURRENCIES = COMMON_CURRENCY_CODES
  .map(code => {
    const currency = cc.code(code)
    return currency ? { code: currency.code, name: currency.currency } : null
  })
  .filter((c): c is { code: string; name: string } => c !== null)

// Currency-to-country mapping for flag display
const currencyToCountryMap: Record<string, string> = {
  USD: 'US',
  EUR: 'EU',
  GBP: 'GB',
  AUD: 'AU',
  CAD: 'CA',
  CHF: 'CH',
  JPY: 'JP',
  CNY: 'CN',
  HKD: 'HK',
  SGD: 'SG',
  NZD: 'NZ',
  INR: 'IN',
  KRW: 'KR',
  BRL: 'BR',
  MXN: 'MX',
  ZAR: 'ZA',
  SEK: 'SE',
  NOK: 'NO',
  DKK: 'DK',
  PLN: 'PL',
  TRY: 'TR',
  RUB: 'RU',
  AED: 'AE',
  SAR: 'SA',
  THB: 'TH',
  MYR: 'MY',
  PHP: 'PH',
  IDR: 'ID',
  VND: 'VN',
  COP: 'CO',
  CLP: 'CL',
  ARS: 'AR',
  PEN: 'PE',
}

// Add remaining currencies from country-to-currency library
Object.entries(countryToCurrency).forEach(([countryCode, currencyCode]) => {
  if (!currencyToCountryMap[currencyCode]) {
    currencyToCountryMap[currencyCode] = countryCode
  }
})

/**
 * Convert a country code to its flag emoji
 * Uses regional indicator symbols (U+1F1E6 to U+1F1FF)
 */
function countryCodeToFlag(countryCode: string): string {
  if (countryCode === 'EU') return '🇪🇺' // Special case for Euro
  if (countryCode.length !== 2) return '🏳️'

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 0x1F1E6 + char.charCodeAt(0) - 65)

  return String.fromCodePoint(...codePoints)
}

/**
 * Get the flag emoji for a currency code
 */
export function getCurrencyFlag(currencyCode: string): string {
  const countryCode = currencyToCountryMap[currencyCode]
  if (!countryCode) return '🏳️'
  return countryCodeToFlag(countryCode)
}

/**
 * Get currency details by code using the currency-codes library
 */
export function getCurrencyDetails(code: string) {
  return cc.code(code)
}

/**
 * Get the default currency code for a country
 */
export function getDefaultCurrency(countryCode: string): string | undefined {
  return countryToCurrency[countryCode as keyof typeof countryToCurrency]
}

/**
 * Get timezones for a country
 */
export function getCountryTimezones(countryCode: string): string[] {
  const country = ct.getCountry(countryCode)
  return country?.timezones || []
}

/**
 * Get country details
 */
export function getCountryDetails(countryCode: string) {
  return ct.getCountry(countryCode)
}

// Pre-built CURRENCY_FLAGS map for backwards compatibility
export const CURRENCY_FLAGS: Record<string, string> = Object.fromEntries(
  COMMON_CURRENCY_CODES.map(code => [code, getCurrencyFlag(code)])
)

/**
 * Get all available timezones sorted by offset and name
 */
export function getAllTimezones(): Array<{ value: string; label: string }> {
  const allTimezones = ct.getAllTimezones()
  return Object.values(allTimezones)
    .map(tz => ({
      value: tz.name,
      label: tz.name.replace(/_/g, ' '),
      offset: tz.utcOffset
    }))
    .sort((a, b) => a.offset - b.offset || a.label.localeCompare(b.label))
    .map(({ value, label }) => ({ value, label }))
}

