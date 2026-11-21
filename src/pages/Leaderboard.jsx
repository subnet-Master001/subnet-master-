import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import RankBadge from '../components/RankBadge.jsx'
import { supabase } from '../supabaseClient.js'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, codename, school, questions_used_today, avatar_url')
          .order('questions_used_today', { ascending: false, nullsFirst: false })
          .limit(20)
        if (active) {
          if (error) setError(error.message)
          else setRows(data ?? [])
        }
      } catch (e) {
        if (active) setError(e.message || 'Could not load leaderboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading leaderboard…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Top 20 subnetters, ranked by questions answered.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-8 text-center text-slate-500 backdrop-blur-md">
            No players ranked yet — go answer some questions!
          </div>
        )}

        <ol className="space-y-3">
          {rows.map((row, i) => {
            const rank = i + 1
            const score = row.questions_used_today ?? 0
            const codename = row.codename || 'SubnetPlayer'
            const school = row.school || '—'
            const top3 = rank <= 3
            return (
              <li
                key={row.id ?? i}
                className={`flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-md transition ${
                  top3
                    ? 'border-amber-300/50 bg-white/85 shadow-lg'
                    : 'border-slate-200/50 bg-white/70 shadow-sm'
                }`}
              >
                {/* rank / medal */}
                <div className="flex w-10 shrink-0 items-center justify-center text-2xl">
                  {top3 ? (
                    <span aria-label={`Rank ${rank}`}>{MEDALS[rank - 1]}</span>
                  ) : (
                    <span className="font-mono text-lg font-bold text-slate-400">{rank}</span>
                  )}
                </div>

                {/* avatar */}
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {row.avatar_url ? (
                    <img src={row.avatar_url} alt={codename} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-base font-bold text-slate-400">
                      {codename ? codename[0].toUpperCase() : 'S'}
                    </div>
                  )}
                </div>

                {/* name + school */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{codename}</p>
                  <p className="truncate text-xs text-slate-500">{school}</p>
                </div>

                {/* rank badge */}
                <div className="shrink-0">
                  <RankBadge score={score} />
                </div>

                {/* score */}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-lg font-bold text-slate-700">{score}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">pts</p>
                </div>
              </li>
            )
          })}
        </ol>
      </main>
    </div>
  )
}
