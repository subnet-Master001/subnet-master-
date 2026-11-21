// src/components/RankBadge.jsx
import { getRank } from '../utils/ranks.js'

// Per-tier styling. Color + glow escalate with rank; only the Warrior tier
// renders ⭐ stars (1–5). Works on both the dark ID card and light surfaces.
const TIER_STYLES = {
  Rookie:
    'bg-slate-700 text-slate-100 ring-slate-400/30 shadow-[0_0_10px_rgba(148,163,184,0.45)]',
  Apprentice:
    'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-800 ring-slate-300/70 shadow-[0_0_12px_rgba(203,213,225,0.6)]',
  Warrior:
    'bg-gradient-to-r from-amber-300 to-yellow-500 text-amber-950 ring-amber-300/70 shadow-[0_0_14px_rgba(245,158,11,0.65)]',
  Elite:
    'bg-gradient-to-r from-violet-500 to-purple-600 text-white ring-violet-300/70 shadow-[0_0_16px_rgba(168,85,247,0.7)]',
  Legend:
    'bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400 text-white ring-white/50 shadow-[0_0_20px_rgba(217,70,239,0.75)]',
}

/**
 * Premium rank pill. Pass a `score` to compute the rank, or pass explicit
 * `tier` / `stars` if you've already computed them.
 */
export default function RankBadge({ score, tier: tierProp, stars: starsProp, className = '' }) {
  const { tier, stars } =
    tierProp !== undefined
      ? { tier: tierProp, stars: starsProp ?? 0 }
      : getRank(score ?? 0)

  const style = TIER_STYLES[tier] ?? TIER_STYLES.Rookie

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${style} ${className}`}
    >
      <span>{tier}</span>
      {stars > 0 && (
        <span className="flex items-center drop-shadow-sm">
          {Array.from({ length: stars }).map((_, i) => (
            <span key={i} className="text-[10px] leading-none">
              ⭐
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
