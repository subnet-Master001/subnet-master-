import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import RankBadge from '../components/RankBadge.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../supabaseClient.js'

// The "Subnet" prefix is a fixed part of every player's codename. We store the
// full handle (e.g. "Subnetwizard") and strip the prefix when populating the
// input so the user only edits the unique part.
function withPrefix(value) {
  return value && value.trim() ? `Subnet${value.trim()}` : null
}

function stripPrefix(value) {
  if (!value) return ''
  return value.startsWith('Subnet') ? value.slice('Subnet'.length) : value
}

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [codename, setCodename] = useState('')
  const [school, setSchool] = useState('')
  const [course, setCourse] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null) // saved public URL
  const [avatarFile, setAvatarFile] = useState(null) // newly picked File
  const [avatarPreview, setAvatarPreview] = useState(null) // object URL preview
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [usedToday, setUsedToday] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, codename, school, course, avatar_url, questions_used_today')
          .eq('id', user.id)
          .maybeSingle()
        if (active && !error && data) {
          setCodename(stripPrefix(data.codename))
          setSchool(data.school ?? '')
          setCourse(data.course ?? '')
          setAvatarUrl(data.avatar_url ?? null)
          setUsedToday(data.questions_used_today ?? 0)
        }
      } catch {
        // best-effort load
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [user?.id])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      let finalAvatarUrl = avatarUrl

      // Upload the new avatar (if one was picked) to the public `avatars` bucket.
      if (avatarFile) {
        const ext = (avatarFile.name.split('.').pop() || 'png').toLowerCase()
        const filePath = `${user.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            contentType: avatarFile.type,
            cacheControl: '3600',
            upsert: false,
          })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalAvatarUrl = data.publicUrl
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          codename: withPrefix(codename),
          school: school.trim() || null,
          course: course.trim() || null,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user.id)
      if (updateErr) throw updateErr

      setAvatarUrl(finalAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      setMessage('Player ID saved!')
    } catch (err) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading…
        </div>
      </div>
    )
  }

  const displayAvatar = avatarPreview || avatarUrl
  const serial = `SM-${(user?.id ?? 'guest0000').slice(0, 8).toUpperCase()}`

  // Format signup date as "NOV 2026" from the Supabase auth user object.
  // user.created_at is an ISO-8601 string set by Supabase Auth at signup time.
  const joinedLabel = (() => {
    const raw = user?.created_at
    if (!raw) return null
    const d = new Date(raw)
    if (isNaN(d.getTime())) return null
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
  })()

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Player Profile</h1>
          <p className="mt-1 text-sm text-slate-400">
            Design your Player ID — the card updates live as you type.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ───────────── Player ID Card (left / top on mobile) ───────────── */}
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 shadow-2xl shadow-purple-500/20">
            {/* glow accents */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

            <div className="relative flex flex-col gap-5">

              {/* ── card header row ── */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-300/80">
                  SubnetMaster · Player ID
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Network Online
                </span>
              </div>

              {/* ── horizontal identity row: avatar left | details right ── */}
              <div className="flex items-start gap-5">

                {/* avatar */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 opacity-60 blur-md" />
                  <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/20 bg-slate-800 shadow-lg">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                        {codename ? codename[0].toUpperCase() : 'S'}
                      </div>
                    )}
                  </div>
                </div>

                {/* details column */}
                <div className="min-w-0 flex-1">
                  {/* codename */}
                  <p className="font-mono text-xl font-bold leading-tight tracking-tight text-white">
                    Subnet
                    <span className={codename ? 'text-white' : 'text-white/30'}>
                      {codename || 'codename'}
                    </span>
                  </p>

                  {/* clearance level */}
                  <div className="mt-2 flex flex-col gap-0.5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-purple-300/60">
                      Clearance Level
                    </p>
                    <RankBadge score={usedToday} />
                  </div>

                  {/* school / course / joined — stack neatly, no truncation */}
                  <div className="mt-3 space-y-1.5">
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-300/60">
                        School
                      </p>
                      <p className={`text-sm leading-snug ${school ? 'text-slate-100' : 'text-slate-500'}`}>
                        {school || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-300/60">
                        Course
                      </p>
                      <p className={`text-sm leading-snug ${course ? 'text-slate-100' : 'text-slate-500'}`}>
                        {course || 'Not set'}
                      </p>
                    </div>
                    {joinedLabel && (
                      <div>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-300/60">
                          Member Since
                        </p>
                        <p className="font-mono text-sm text-slate-100">{joinedLabel}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── barcode + footer — full width ── */}
              <div className="border-t border-white/10 pt-4">
                <div
                  aria-hidden="true"
                  className="h-8 w-full opacity-70"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg,rgba(255,255,255,0.85) 0 2px,transparent 2px 4px,rgba(255,255,255,0.85) 4px 5px,transparent 5px 8px,rgba(255,255,255,0.85) 8px 11px,transparent 11px 13px,rgba(255,255,255,0.85) 13px 14px,transparent 14px 17px)',
                  }}
                />
                <div className="mt-1.5 grid grid-cols-3 items-center font-mono text-[10px] text-slate-500">
                  <span>ID: {serial}</span>
                  <span className="text-center text-purple-300/40">CCNA · v1.0</span>
                  <span className="text-right">{joinedLabel ? `JOINED: ${joinedLabel}` : ''}</span>
                </div>
              </div>

            </div>
          </div>

          {/* ───────────── Edit Form (right / below on mobile) ───────────── */}
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >
            <h2 className="text-lg font-semibold text-white">Edit details</h2>
            <p className="mt-1 text-sm text-slate-400">Changes preview live on your ID card.</p>

            {/* avatar upload */}
            <div className="mt-6 flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-400">
                    {codename ? codename[0].toUpperCase() : 'S'}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Upload avatar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="mt-1 text-xs text-slate-500">PNG, JPG or GIF.</p>
              </div>
            </div>

            {/* codename with fixed Subnet prefix */}
            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-slate-300">Codename</label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-white/10 bg-white/5 px-3 text-sm font-semibold text-purple-300">
                  Subnet
                </span>
                <input
                  value={codename}
                  onChange={(e) => setCodename(e.target.value)}
                  placeholder="wizard"
                  maxLength={24}
                  className="w-full rounded-r-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
            </div>

            {/* school */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">School</label>
              <input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Lagos State University"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* course */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">Course</label>
              <input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white placeholder:text-slate-500 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* messages */}
            {error && (
              <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {message && (
              <div className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {message}
              </div>
            )}

            {/* actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-indigo-400 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
