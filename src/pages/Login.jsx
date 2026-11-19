import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { isSupabaseConfigured } from '../supabaseClient.js'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Redirect authenticated users away from the login page.
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signIn({ email: email.trim(), password })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-sm">
            S
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to keep practicing subnetting.</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase isn’t configured yet. Add your credentials to <code className="font-mono">.env</code> to sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don’t have an account?{' '}
            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
