import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../supabaseClient.js'
import {
  generateQuestion,
  calculateNetworkAddress,
  getSubnetBreakdown,
} from '../utils/subnetMath.js'

const DAILY_LIMIT = 10
const QUESTION_TIME = 60

export default function Dashboard() {
  const { user } = useAuth()

  // Profile is fetched here (from the profiles table) so the daily-limit
  // logic has a single, authoritative source for is_pro and questions_used_today.
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [question, setQuestion] = useState(() => generateQuestion())
  const [qid, setQid] = useState(0) // changes per question → re-triggers the entrance animation
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null) // { correct, correctAnswer, breakdown }
  const [submitted, setSubmitted] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  // Gamification state
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)

  const inputRef = useRef(null)
  // Guards against double-grading when the user double-clicks Submit.
  const gradingRef = useRef(false)

  const isPro = profile?.is_pro ?? false
  const usedToday = profile?.questions_used_today ?? 0
  const atLimit = !isPro && usedToday >= DAILY_LIMIT

  async function loadProfile() {
    if (!user) {
      setProfileLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_pro, questions_used_today, last_active_date')
        .eq('id', user.id)
        .maybeSingle()
      if (!error) setProfile(data)
    } catch {
      // Best-effort: if the read fails (e.g. RLS), the limit feature degrades
      // gracefully and the arena stays available.
    } finally {
      setProfileLoading(false)
    }
  }

  // Grading logic. Sets the result and updates the streak, and counts the
  // question toward the daily quota. This is ONLY called from handleSubmit
  // (an explicit click), so the feedback box only ever appears after the user
  // submits — never on load or from a background timer.
  async function gradeAnswer(isCorrect) {
    if (gradingRef.current) return
    gradingRef.current = true

    const correctAnswer = calculateNetworkAddress(question.ip, question.cidr)
    setResult({
      correct: isCorrect,
      correctAnswer,
      breakdown: getSubnetBreakdown(question.ip, question.cidr),
    })
    setSubmitted(true)
    setStreak(isCorrect ? (s) => s + 1 : 0)

    // Every submission counts toward the daily quota.
    if (!user) return
    const newCount = usedToday + 1
    const { error } = await supabase
      .from('profiles')
      .update({ questions_used_today: newCount })
      .eq('id', user.id)
    if (!error) {
      setProfile((p) => (p ? { ...p, questions_used_today: newCount } : p))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const correctAnswer = calculateNetworkAddress(question.ip, question.cidr)
    const normalized = answer.trim().replace(/\s+/g, '')
    await gradeAnswer(normalized === correctAnswer)
  }

  function nextQuestion() {
    gradingRef.current = false
    setSubmitted(false)
    setResult(null)
    setAnswer('')
    setTimeLeft(QUESTION_TIME)
    setQid((q) => q + 1)
    setQuestion(generateQuestion())
  }

  async function handleUpgrade() {
    setUpgrading(true)
    setUpgradeError('')
    // Simulated Paystack checkout — replaced by the real gateway later.
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const { error } = await supabase
      .from('profiles')
      .update({ is_pro: true })
      .eq('id', user.id)
    if (error) {
      setUpgrading(false)
      setUpgradeError(error.message)
      return
    }
    // Reload so the freshly-true is_pro flag takes effect across the app.
    window.location.reload()
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Focus the answer input as soon as it is re-enabled (after "Next question")
  // so the user can keep typing without having to click it first.
  useEffect(() => {
    if (!submitted) inputRef.current?.focus()
  }, [submitted])

  // Countdown: only ticks while a question is actively being answered
  // (arena visible, not yet submitted). This is a VISUAL countdown only — it
  // does NOT auto-submit. Feedback appears only when the user clicks Submit.
  useEffect(() => {
    if (submitted || atLimit || profileLoading) return
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [submitted, atLimit, profileLoading])

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Practice Arena</h1>
            <p className="mt-1 text-sm text-slate-500">
              Given the IP address and CIDR, work out the{' '}
              <span className="font-medium text-slate-700">network address</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-600">
              🔥 {streak} Streak
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isPro ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isPro ? 'Pro · Unlimited' : `${usedToday} / ${DAILY_LIMIT} used today`}
            </span>
          </div>
        </div>

        {atLimit ? (
          <UpgradeCard upgrading={upgrading} error={upgradeError} onUpgrade={handleUpgrade} />
        ) : (
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            {/* Question card — animates in (fade + slide up) on every new question */}
            <motion.div
              key={qid}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative mb-6 rounded-xl bg-slate-900 p-6 text-center"
            >
              {!submitted && (
                <span
                  className={`absolute right-3 top-3 rounded-full px-2 py-0.5 font-mono text-xs font-bold ${
                    timeLeft <= 10
                      ? 'animate-pulse bg-red-500/20 text-red-400'
                      : timeLeft <= 20
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  {timeLeft}s
                </span>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Find the network address for
              </p>
              <p className="mt-2 font-mono text-3xl font-bold text-white sm:text-4xl">
                {question.ip}
                <span className="text-indigo-400">/{question.cidr}</span>
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="answer" className="mb-1 block text-sm font-medium text-slate-700">
                  Network address
                </label>
                <input
                  id="answer"
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. 192.168.1.0"
                  autoComplete="off"
                  className="w-full rounded-lg border border-purple-500/40 bg-slate-900 px-3 py-2.5 font-mono text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.45)]"
                />
              </div>
              <div className="flex gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={submitted ? nextQuestion : handleSubmit}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
                >
                  {submitted ? 'Next question' : 'Submit answer'}
                </motion.button>
              </div>
            </form>

            {/* Feedback — only renders after the user clicks Submit */}
            {submitted === true && result !== null && (
              <div className="mt-6">
                {result.correct ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="font-semibold text-green-800">✓ Correct!</p>
                    <p className="mt-1 text-sm text-green-700">
                      Nice work. The network address is{' '}
                      <span className="font-mono font-semibold">{result.correctAnswer}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="font-semibold text-red-800">✗ Incorrect</p>
                    <p className="mt-1 text-sm text-red-700">
                      The correct network address is{' '}
                      <span className="font-mono font-semibold">{result.correctAnswer}</span>.
                    </p>

                    <div className="mt-4 rounded-lg border border-slate-100 bg-white p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-800">Step-by-step solution</p>
                      <ol className="space-y-3">
                        {result.breakdown.steps.map((step, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-semibold text-slate-800">
                              {i + 1}. {step.title}
                            </span>
                            <div className="mt-0.5 text-slate-600">{step.detail}</div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          Signed in as {user?.email}
        </p>
      </main>
    </div>
  )
}

function UpgradeCard({ upgrading, error, onUpgrade }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-purple-600 to-violet-600 px-6 py-8 text-center sm:px-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">
          ⭐
        </div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">Upgrade to SubnetMaster Pro</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-purple-100">
          You&rsquo;ve reached your daily limit of 10 questions! Upgrade to SubnetMaster Pro for
          unlimited practice.
        </p>
      </div>
      <div className="px-6 py-8 text-center sm:px-10">
        <button
          onClick={onUpgrade}
          disabled={upgrading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-10"
        >
          {upgrading && (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {upgrading ? 'Processing…' : 'Upgrade for ₦1,500/month'}
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs text-slate-400">Secure checkout powered by Paystack (demo).</p>
      </div>
    </div>
  )
}
