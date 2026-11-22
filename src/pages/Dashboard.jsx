import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import RankUpModal from '../components/RankUpModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../supabaseClient.js'
import { getRank } from '../utils/ranks.js'
import {
  generateQuestion,
  calculateNetworkAddress,
  getSubnetBreakdown,
} from '../utils/subnetMath.js'

const DAILY_LIMIT = 10
const QUESTION_TIME = 60

export default function Dashboard() {
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [question, setQuestion] = useState(() => generateQuestion())
  const [qid, setQid] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  // Gamification
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)

  // Session-local accuracy tracking (correct / total answered this session)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  // Rank-up modal state
  const [rankUpData, setRankUpData] = useState(null) // { tier, stars, score } | null

  const inputRef = useRef(null)
  const gradingRef = useRef(false)

  const isPro = profile?.is_pro ?? false
  const usedToday = profile?.questions_used_today ?? 0
  const atLimit = !isPro && usedToday >= DAILY_LIMIT

  // Derived: accuracy percentage for the current session
  const accuracy = sessionTotal === 0 ? null : Math.round((sessionCorrect / sessionTotal) * 100)

  async function loadProfile() {
    if (!user) { setProfileLoading(false); return }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_pro, questions_used_today, last_active_date')
        .eq('id', user.id)
        .maybeSingle()
      if (!error) setProfile(data)
    } catch { /* best-effort */ } finally {
      setProfileLoading(false)
    }
  }

  async function gradeAnswer(isCorrect) {
    if (gradingRef.current) return
    gradingRef.current = true

    const correctAnswer = calculateNetworkAddress(question.ip, question.cidr)
    setResult({ correct: isCorrect, correctAnswer, breakdown: getSubnetBreakdown(question.ip, question.cidr) })
    setSubmitted(true)
    setStreak(isCorrect ? (s) => s + 1 : 0)

    // Update session accuracy counters
    setSessionTotal((t) => t + 1)
    if (isCorrect) setSessionCorrect((c) => c + 1)

    if (!user) return
    const newCount = usedToday + 1

    // ── Rank-up detection ─────────────────────────────────────────────────
    // Compare the tier before and after incrementing the score.  If they
    // differ, the user just crossed a boundary — show the modal.
    const prevTier = getRank(usedToday).tier
    const nextRank = getRank(newCount)
    if (nextRank.tier !== prevTier) {
      setRankUpData({ tier: nextRank.tier, stars: nextRank.stars, score: newCount })
    }
    // ─────────────────────────────────────────────────────────────────────

    const { error } = await supabase
      .from('profiles')
      .update({ questions_used_today: newCount })
      .eq('id', user.id)
    if (!error) setProfile((p) => (p ? { ...p, questions_used_today: newCount } : p))
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
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const { error } = await supabase.from('profiles').update({ is_pro: true }).eq('id', user.id)
    if (error) { setUpgrading(false); setUpgradeError(error.message); return }
    window.location.reload()
  }

  useEffect(() => { loadProfile() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!submitted) inputRef.current?.focus() }, [submitted])

  useEffect(() => {
    if (submitted || atLimit || profileLoading) return
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [submitted, atLimit, profileLoading])

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* ambient neon glow circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-0 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      <Navbar />

      {/* ── Rank-up modal ── */}
      <RankUpModal
        show={rankUpData !== null}
        newTier={rankUpData?.tier ?? ''}
        newStars={rankUpData?.stars ?? 0}
        newScore={rankUpData?.score ?? 0}
        onDismiss={() => setRankUpData(null)}
      />

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ── Page header ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Practice Arena</h1>
            <p className="mt-1 text-sm text-slate-400">
              Given the IP address and CIDR, work out the{' '}
              <span className="font-medium text-slate-200">network address</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-sm font-bold text-orange-300 ring-1 ring-orange-400/30">
              🔥 {streak} Streak
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              isPro ? 'bg-amber-500/15 text-amber-300 ring-amber-400/30' : 'bg-slate-800 text-slate-300 ring-slate-700'
            }`}>
              {isPro ? 'Pro · Unlimited' : `${usedToday} / ${DAILY_LIMIT} used today`}
            </span>
          </div>
        </div>

        {/* ── Analytics cards ── */}
        <AnimatePresence>
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mb-6 grid grid-cols-3 gap-3 sm:gap-4"
            aria-label="Your analytics"
          >
            <StatCard
              icon="📊"
              label="Questions"
              value={usedToday}
              sub="answered today"
            />
            <StatCard
              icon="🔥"
              label="Streak"
              value={streak}
              sub="in a row"
              highlight={streak >= 5}
            />
            <StatCard
              icon="🎯"
              label="Accuracy"
              value={accuracy === null ? '—' : `${accuracy}%`}
              sub={sessionTotal === 0 ? 'this session' : `${sessionCorrect}/${sessionTotal} correct`}
              highlight={accuracy !== null && accuracy >= 80}
            />
          </motion.section>
        </AnimatePresence>

        {/* ── Practice arena ── */}
        {atLimit ? (
          <UpgradeCard upgrading={upgrading} error={upgradeError} onUpgrade={handleUpgrade} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
            {/* Question card */}
            <motion.div
              key={qid}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative mb-6 rounded-2xl border border-purple-500/40 bg-black/50 p-6 text-center shadow-[0_0_35px_-10px_rgba(168,85,247,0.55)] backdrop-blur-md"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Find the network address for
              </p>
              <p className="mt-2 font-mono text-3xl font-bold text-white sm:text-4xl">
                {question.ip}
                <span className="text-purple-400">/{question.cidr}</span>
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="answer" className="mb-1 block text-sm font-medium text-slate-300">
                  Network address
                </label>
                <input
                  id="answer"
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g. 192.168.1.0"
                  autoComplete="off"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:shadow-[0_0_20px_rgba(168,85,247,0.45)]"
                />
              </div>

              {/* Timer + action button */}
              <div className="flex items-stretch gap-3">
                {!submitted && (
                  <div
                    aria-label={`${timeLeft} seconds remaining`}
                    className={`flex h-14 w-14 shrink-0 animate-breathe flex-col items-center justify-center rounded-full border-2 font-mono ${
                      timeLeft <= 10
                        ? 'border-red-500 text-red-400 shadow-[0_0_18px_rgba(239,68,68,0.6)]'
                        : timeLeft <= 20
                        ? 'border-amber-400 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                        : 'border-purple-500 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.5)]'
                    }`}
                  >
                    <span className="text-lg font-bold leading-none">{timeLeft}</span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider opacity-70">sec</span>
                  </div>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={submitted ? nextQuestion : handleSubmit}
                  className="flex h-14 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 font-semibold text-white transition hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  {submitted ? 'Next question' : 'Submit answer'}
                </motion.button>
              </div>
            </form>

            {/* Feedback */}
            {submitted === true && result !== null && (
              <div className="mt-6">
                {result.correct ? (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                    <p className="font-semibold text-green-300">✓ Correct!</p>
                    <p className="mt-1 text-sm text-green-200/90">
                      Nice work. The network address is{' '}
                      <span className="font-mono font-semibold">{result.correctAnswer}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="font-semibold text-red-300">✗ Incorrect</p>
                    <p className="mt-1 text-sm text-red-200/90">
                      The correct network address is{' '}
                      <span className="font-mono font-semibold">{result.correctAnswer}</span>.
                    </p>
                    <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-950/50 p-4">
                      <p className="mb-3 text-sm font-semibold text-slate-200">Step-by-step solution</p>
                      <ol className="space-y-3">
                        {result.breakdown.steps.map((step, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-semibold text-slate-200">{i + 1}. {step.title}</span>
                            <div className="mt-0.5 text-slate-400">{step.detail}</div>
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

        <p className="mt-4 text-center text-xs text-slate-500">Signed in as {user?.email}</p>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Analytics stat card
───────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, highlight = false }) {
  return (
    <div className={`flex flex-col rounded-2xl border p-4 backdrop-blur-md transition sm:p-5 ${
      highlight
        ? 'border-purple-500/40 bg-purple-500/10 shadow-[0_0_20px_-6px_rgba(168,85,247,0.4)]'
        : 'border-white/10 bg-white/5'
    }`}>
      <span className="text-xl sm:text-2xl">{icon}</span>
      <p className={`mt-2 text-xl font-black leading-none sm:text-2xl ${
        highlight ? 'text-purple-300' : 'text-white'
      }`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{sub}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Upgrade card (daily limit reached)
───────────────────────────────────────────────────────── */
function UpgradeCard({ upgrading, error, onUpgrade }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/80 shadow-2xl backdrop-blur-lg">
      <div className="bg-gradient-to-br from-purple-600 to-violet-600 px-6 py-8 text-center sm:px-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl">⭐</div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">Upgrade to SubnetMaster Pro</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-purple-100">
          You&rsquo;ve reached your daily limit of 10 questions! Upgrade to SubnetMaster Pro for unlimited practice.
        </p>
      </div>
      <div className="px-6 py-8 text-center sm:px-10">
        <button
          onClick={onUpgrade}
          disabled={upgrading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-10"
        >
          {upgrading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {upgrading ? 'Processing…' : 'Upgrade for ₦1,500/month'}
        </button>
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        <p className="mt-4 text-xs text-slate-500">Secure checkout powered by Paystack (demo).</p>
      </div>
    </div>
  )
}
