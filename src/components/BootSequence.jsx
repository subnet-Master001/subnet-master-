import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Cinematic 10-second brand-mark intro — three sequential phases:
 *
 *  Phase 1 (0 s)     — 'S' logo springs into the centre from nothing
 *  Phase 2 (~0.9 s)  — 'SUBNETMASTER' text fades + slides in beside the logo
 *  Phase 3 (~1.6 s)  — logo pulses with a bright glowing heartbeat for the rest
 *
 * The parent (Login / Signup) keeps this mounted for 10 s via its own
 * setTimeout, then AnimatePresence fades it out.
 */
export default function BootSequence() {
  // Which animation phase we are in: 0 = logo only, 1 = text visible, 2 = pulsing
  const [step, setStep] = useState(0)

  useEffect(() => {
    // After the spring settles, start the text slide-in
    const t1 = setTimeout(() => setStep(1), 900)
    // Once text has appeared, switch to the heartbeat phase
    const t2 = setTimeout(() => setStep(2), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Row: logo + text side by side */}
      <div className="flex items-center gap-5">

        {/* ── Logo ── */}
        <motion.div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-black text-white"
          /* Phase 1: spring pop-in */
          initial={{ scale: 0, opacity: 0 }}
          animate={
            step === 2
              ? {
                  scale: [1, 1.08, 1],
                  opacity: 1,
                  boxShadow: [
                    '0 0 30px rgba(168,85,247,0.55)',
                    '0 0 70px rgba(168,85,247,1)',
                    '0 0 30px rgba(168,85,247,0.55)',
                  ],
                }
              : { scale: 1, opacity: 1, boxShadow: '0 0 30px rgba(168,85,247,0.55)' }
          }
          transition={
            step === 0
              ? { type: 'spring', stiffness: 260, damping: 18, mass: 0.9 }
              : step === 2
              ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        >
          S

          {/* ripple rings — only shown during the heartbeat phase */}
          {step === 2 && (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-2xl border border-purple-500/70"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-2xl border border-indigo-400/50"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
              />
            </>
          )}
        </motion.div>

        {/* ── Wordmark ── */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="flex flex-col"
            >
              <span className="font-mono text-2xl font-black uppercase tracking-[0.12em] text-white sm:text-3xl">
                SUBNET
                <span className="text-purple-400">MASTER</span>
              </span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em] text-slate-500">
                CCNA Subnetting Practice
              </span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
