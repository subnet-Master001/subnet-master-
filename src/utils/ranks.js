// src/utils/ranks.js
// Pure rank engine. Maps a player's score (questions_used_today) to a
// rank tier + star level.
//
//   0–50       -> Rookie
//   51–150     -> Apprentice
//   151–400    -> Warrior  (1 star per 50 pts: 151–200 = 1★ … 351–400 = 5★)
//   401–1000   -> Elite
//   1001+      -> Legend
//
// Note: Legend kicks in above 1000 (1001+), so 1000 is Elite. If you want 1000
// itself to be Legend, lower the LEGEND threshold to 1000.

export const RANK_TIERS = ['Rookie', 'Apprentice', 'Warrior', 'Elite', 'Legend']

const LEGEND = 1001
const ELITE = 401
const WARRIOR = 151
const APPRENTICE = 51

const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

// Stars within the Warrior tier: 151–200 => 1, 201–250 => 2, … 351–400 => 5
function warriorStars(score) {
  return clamp(Math.ceil((score - 150) / 50), 1, 5)
}

/**
 * Get a player's rank from their score.
 * @param {number} score - questions_used_today
 * @returns {{ tier: string, stars: number, score: number }}
 */
export function getRank(score) {
  const s = Number.isFinite(score)
    ? clamp(Math.floor(score), 0, Number.MAX_SAFE_INTEGER)
    : 0

  if (s >= LEGEND) return { tier: 'Legend', stars: 0, score: s }
  if (s >= ELITE) return { tier: 'Elite', stars: 0, score: s }
  if (s >= WARRIOR) return { tier: 'Warrior', stars: warriorStars(s), score: s }
  if (s >= APPRENTICE) return { tier: 'Apprentice', stars: 0, score: s }
  return { tier: 'Rookie', stars: 0, score: s }
}

/**
 * Plain-text label, e.g. "Warrior ★★★" or "Legend". Useful for tooltips / alt.
 * @param {number} score
 * @returns {string}
 */
export function rankLabel(score) {
  const { tier, stars } = getRank(score)
  return stars > 0 ? `${tier} ${'★'.repeat(stars)}` : tier
}
