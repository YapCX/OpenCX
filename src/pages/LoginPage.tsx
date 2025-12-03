import { useState } from 'react'
import { useAuthActions } from "@convex-dev/auth/react"
import { useConvexAuth } from "convex/react"
import { Navigate } from 'react-router-dom'
import { DollarSign, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

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
    setIsSubmitting(true)

    try {
      await signIn('password', { email, password, flow: isSignUp ? 'signUp' : 'signIn' })
    } catch (err) {
      setError(isSignUp ? 'Could not create account. Try a different email.' : 'Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-primary-600/20 rounded-2xl flex items-center justify-center">
              <DollarSign className="h-12 w-12 text-primary-500" />
            </div>
          </div>
          <h1 className="mt-6 text-4xl font-bold text-dark-50">OpenCX</h1>
          <p className="mt-2 text-sm text-dark-400">
            Currency Exchange Management System
          </p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-dark-100 mb-6">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email address
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
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter your password"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting
                ? (isSignUp ? 'Creating account...' : 'Signing in...')
                : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
              }}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-dark-500">
          OpenCX - Open Source Currency Exchange Management
        </p>
      </div>
    </div>
  )
}
