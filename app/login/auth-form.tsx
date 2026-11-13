'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { logIn, signUp } from '@/app/actions/auth'

type AuthMode = 'login' | 'signup'

export default function AuthForm({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    // Client-side validation
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!trimmedPassword) {
      setError('Please enter your password.')
      return
    }

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    startTransition(async () => {
      try {
        if (mode === 'signup') {
          const res = await signUp({ email: trimmedEmail, password: trimmedPassword })
          if (res.error) {
            setError(res.error)
          } else if (res.success) {
            setSuccessMessage(
              res.message ||
                (res.needsConfirmation
                  ? 'Please check your email to confirm your account.'
                  : 'Account created successfully!')
            )
            if (!res.needsConfirmation) {
              router.push('/events')
              router.refresh()
            }
          }
        } else {
          const res = await logIn({ email: trimmedEmail, password: trimmedPassword })
          if (res.error) {
            setError(res.error)
          } else if (res.success) {
            setSuccessMessage('Logged in successfully. Redirecting...')
            router.push('/events')
            router.refresh()
          }
        }
      } catch {
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
      {/* Mode Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {mode === 'login' ? 'Host Log In' : 'Create Host Account'}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {mode === 'login'
            ? 'Sign in to access and manage your events.'
            : 'Sign up to create events and track your guest RSVPs.'}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 mb-6">
        <button
          type="button"
          onClick={() => switchMode('login')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'login'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => switchMode('signup')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'signup'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <div className="flex">
            <span className="font-semibold mr-1.5">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <div className="flex">
            <span className="font-semibold mr-1.5">Success:</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            placeholder="host@example.com"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50"
          />
          {mode === 'signup' && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Must be at least 6 characters long.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-3 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-base font-medium transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-60 flex items-center justify-center min-h-[48px]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              {mode === 'login' ? 'Logging in...' : 'Creating account...'}
            </span>
          ) : mode === 'login' ? (
            'Log In'
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Switch mode helper */}
      <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {mode === 'login' ? (
          <p>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="font-semibold text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-80"
            >
              Sign up
            </button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-semibold text-zinc-900 dark:text-zinc-100 underline underline-offset-2 hover:opacity-80"
            >
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

