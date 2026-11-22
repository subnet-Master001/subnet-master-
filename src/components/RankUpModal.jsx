import { motion, AnimatePresence } from 'framer-motion'
import RankBadge from './RankBadge.jsx'

/**
 * Full-screen rank-up celebration modal.
 *
 * Props:
 *   show        – boolean, controlled by parent
 *   newTier     – string, e.g. 'Apprentice'
 *   newStars    – number (0 for non-Warrior tiers)
 *   newScore    – number, the score that triggered the rank-up
 *   onDismiss   – () => void
 */
export default function RankUpModal({ show, newTier, newStars = 0, newScore = 0, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="rankup-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
        >
          {/* Card — stop propagation so clicking the card doesn't dismiss */}
          <motion.div
            key="rankup-card"
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-purple-500/40 bg-slate-900 shadow-2xl shadow-purple-500/30"
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.8 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* top glow strip */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/80 to-transparent" />

            {/* ambient orb */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-600/25 blur-3xl" />

            <div className="relative px-6 pb-8 pt-10 text-center">
              {/* pulsing ring behind the badge */}
              <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-purple-500/60"
                  animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full border-2 border-indigo-400/50"
                  animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
                />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl font-black text-white shadow-lg shadow-purple-500/40">
                  S
                </div>
              </div>

              {/* headline */}
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-purple-400/70">
                Achievement Unlocked
              </p>
              <h2 className="mt-1 text-4xl font-black tracking-tight text-white">RANK UP!</h2>

              {/* new badge */}
              <div className="mt-4 flex justify-center">
                <RankBadge tier={newTier} stars={newStars} className="text-sm px-4 py-1.5" />
              </div>

              <p className="mt-3 text-sm text-slate-400">
                You reached <span className="font-semibold text-slate-200">{newScore} questions</span>{' '}
                and levelled up to{' '}
                <span className="font-semibold text-white">{newTier}</span>!
              </p>

              {/* dismiss */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onDismiss}
                className="mt-7 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:from-indigo-400 hover:to-purple-500 hover:shadow-[0_0_28px_rgba(168,85,247,0.55)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Continue Practicing
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
