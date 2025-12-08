import { useState, useMemo } from 'react'
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { Navigate, Link } from 'react-router-dom'
import { DollarSign, Eye, EyeOff } from 'lucide-react'
import { COUNTRIES, CURRENCIES, getDefaultCurrency, getCountryTimezones } from '../utils/currencyData'

export function SignupPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()

  const [companyName, setCompanyName] = useState('')
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [country, setCountry] = useState('')
  const [baseCurrency, setBaseCurrency] = useState('')
  const [timeZone, setTimeZone] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get timezones for selected country
  const timezones = useMemo(() => {
    if (!country) return []
    const tzList = getCountryTimezones(country)
    return tzList.map((tz: string) => ({
      value: tz,
      label: tz.replace(/_/g, ' ')
    }))
  }, [country])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)

    try {
      await signIn('password', { email, password, flow: 'signUp' })
      // After successful signup, user is authenticated and will be redirected to dashboard
    } catch (err) {
      setError('Could not create account. Email may already be in use.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-primary-600/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-primary-500" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-dark-50">Create Your Account</h1>
          <p className="mt-2 text-sm text-dark-400">
            Set up your currency exchange business on OpenCX
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="companyName" className="label">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input"
                  placeholder="Acme Exchange LLC"
                />
              </div>
              <div>
                <label htmlFor="userName" className="label">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="userName"
                  name="userName"
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="input"
                  placeholder="John Smith"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="label">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="label">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  id="country"
                  name="country"
                  required
                  value={country}
                  onChange={(e) => {
                    const selectedCountry = e.target.value
                    setCountry(selectedCountry)
                    // Auto-select currency based on country
                    const defaultCurrency = getDefaultCurrency(selectedCountry)
                    if (defaultCurrency && CURRENCIES.some(c => c.code === defaultCurrency)) {
                      setBaseCurrency(defaultCurrency)
                    }
                    // Auto-select first timezone for the country
                    const tzList = getCountryTimezones(selectedCountry)
                    if (tzList.length > 0) {
                      setTimeZone(tzList[0])
                    }
                  }}
                  className="input"
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="baseCurrency" className="label">
                  Base Currency <span className="text-red-500">*</span>
                </label>
                <select
                  id="baseCurrency"
                  name="baseCurrency"
                  required
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="input"
                >
                  <option value="">Select currency...</option>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="timeZone" className="label">
                Time Zone <span className="text-red-500">*</span>
              </label>
              <select
                id="timeZone"
                name="timeZone"
                required
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="input"
              >
                <option value="">{country ? 'Select time zone...' : 'Select country first...'}</option>
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-6"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
