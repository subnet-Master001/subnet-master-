import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { isSupabaseConfigured } from '../supabaseClient.js'
import BootSequence from '../components/BootSequence.jsx'

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isBooting, setIsBooting] = useState(true)

  // Redirect authenticated users away from the login page.
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  // End the cinematic boot sequence after 3 seconds.
  useEffect(() => {
    const t = setTimeout(() => setIsBooting(false), 3000)
    return () => clearTimeout(t)
  }, [])

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      {/* floating neon orbs */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-10 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-10 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]"
        animate={{ x: [0, -40, 0], y: [0, 30, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* cinematic boot sequence */}
      <AnimatePresence>
        {isBooting && (
          <motion.div
            key="boot-screen"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-6"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-slate-600">
              SUBNETMASTER // BOOT
            </div>
            <BootSequence />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: isBooting ? 0 : 1, y: isBooting ? 16 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <motion.span
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white"
            animate={{
              boxShadow: [
                '0 0 20px rgba(168,85,247,0.5)',
                '0 0 45px rgba(168,85,247,0.9)',
                '0 0 20px rgba(168,85,247,0.5)',
              ],
              scale: [1, 1.06, 1],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            S
          </motion.span>
          <h1 className="mt-3 text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to keep practicing subnetting.</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-purple-400/60">
            // Secure Terminal Access
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Supabase isn&rsquo;t configured yet. Add your credentials to{' '}
              <code className="font-mono">.env</code> to sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:shadow-[0_0_18px_rgba(168,85,247,0.4)]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-300">
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
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:shadow-[0_0_18px_rgba(168,85,247,0.4)]"
              />
            </div>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:from-indigo-400 hover:to-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.55)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&rsquo;t have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-purple-400 transition hover:text-purple-300"
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
