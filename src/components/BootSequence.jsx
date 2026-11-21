import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const DURATION = 10 // seconds — must match the setTimeout in Login/Signup

/**
 * Cinematic 10-second brand intro.
 *
 * Layout (all centred, full-screen):
 *   - Two expanding ripple rings around the logo
 *   - Glowing 'S' logo with breathing heartbeat on the whole stack
 *   - 'Subnet Master' wordmark
 *   - Glassmorphism progress bar / status strip counting 0 → 100%
 *
 * The parent (Login/Signup) wraps this in <AnimatePresence> and fades it
 * out after DURATION seconds.
 */
export default function BootSequence() {
  const [pct, setPct] = useState(0)

  // Count from 0 to 100 linearly over DURATION seconds using 60fps-ish steps.
  useEffect(() => {
    let frame
    const start = performance.now()
    const ms = DURATION * 1000

    function tick(now) {
      const elapsed = Math.min(now - start, ms)
      setPct(Math.floor((elapsed / ms) * 100))
      if (elapsed < ms) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950">
      {/* ── ambient background orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-purple-700/15 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-700/15 blur-[140px]"
      />

      {/* ── breathing central stack ── */}
      <motion.div
        className="relative flex flex-col items-center gap-5"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* ripple ring 1 */}
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-6 h-20 w-20 -translate-x-1/2 rounded-full border border-purple-500/60"
          animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
        />
        {/* ripple ring 2 — offset by half a beat */}
        <motion.span
          aria-hidden="true"
          className="absolute left-1/2 top-6 h-20 w-20 -translate-x-1/2 rounded-full border border-indigo-400/50"
          animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.75 }}
        />

        {/* logo */}
        <motion.div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-black text-white shadow-2xl"
          animate={{
            boxShadow: [
              '0 0 25px rgba(168,85,247,0.55)',
              '0 0 55px rgba(168,85,247,1)',
              '0 0 25px rgba(168,85,247,0.55)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          S
        </motion.div>

        {/* wordmark */}
        <div className="text-center">
          <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Subnet<span className="text-purple-400">Master</span>
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em] text-slate-500">
            CCNA Subnetting Practice
          </p>
        </div>

        {/* glassmorphism progress strip */}
        <div className="mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-5 py-3 shadow-xl backdrop-blur-xl sm:w-80">
          {/* track */}
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* label */}
          <p className="mt-2.5 text-center font-mono text-xs text-slate-400">
            INITIALIZING
            <span className="text-purple-300">
              {pct < 100 ? `... ${pct}%` : '... 100%'}
            </span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
