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
          {/*
            Outer card uses overflow-visible so the avatar photo can overlap
            the top edge, just like a real ID badge photo.
          */}
          <div className="relative mt-10 overflow-visible">
            <div className="relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 shadow-2xl shadow-purple-500/25">
              {/* ambient glows */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl" />
              {/* top-edge highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/70 to-transparent" />

              {/* ── header strip ── */}
              <div className="flex items-center justify-between px-6 pt-5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-purple-300/70">
                  SubnetMaster · Player ID
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/20">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Network Online
                </span>
              </div>

              {/* ── identity row ── */}
              {/*
                Avatar sits 40px above the card edge via -mt-10 on its wrapper.
                The card itself has mt-10 on the outer div to absorb the overlap.
              */}
              <div className="relative mt-3 flex items-start gap-5 px-6 pb-5">

                {/* photo — overflows upward */}
                <div className="relative -mt-10 shrink-0">
                  {/* thick glowing ring */}
                  <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-400 opacity-80 blur-[4px]" />
                  <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-400" />
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-black/40 bg-slate-800 shadow-xl">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
                        {codename ? codename[0].toUpperCase() : 'S'}
                      </div>
                    )}
                  </div>
                </div>

                {/* name + rank */}
                <div className="min-w-0 flex-1 pt-1">
                  <p className="font-mono text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
                    Subnet
                    <span className={codename ? 'text-purple-300' : 'text-white/25'}>
                      {codename || 'codename'}
                    </span>
                  </p>
                  <div className="mt-2">
                    <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                      Clearance Level
                    </p>
                    {/* inline-flex wraps tightly around badge text */}
                    <span className="inline-flex">
                      <RankBadge score={usedToday} />
                    </span>
                  </div>
                </div>
              </div>

              {/* ── data-chip grid ── */}
              <div className="grid grid-cols-2 gap-2 px-6 pb-5">
                <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-purple-400/60">School</p>
                  <p className={`mt-0.5 text-sm font-medium leading-snug ${school ? 'text-slate-100' : 'text-slate-500'}`}>
                    {school || '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-purple-400/60">Course</p>
                  <p className={`mt-0.5 text-sm font-medium leading-snug ${course ? 'text-slate-100' : 'text-slate-500'}`}>
                    {course || '—'}
                  </p>
                </div>
                {joinedLabel && (
                  <div className="col-span-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-purple-400/60">Member Since</p>
                    <p className="mt-0.5 font-mono text-sm font-medium text-slate-100">{joinedLabel}</p>
                  </div>
                )}
              </div>

              {/* ── barcode strip ── */}
              <div className="flex items-center gap-4 rounded-b-3xl bg-black/40 px-6 py-3 backdrop-blur-sm">
                <div
                  aria-hidden="true"
                  className="h-8 flex-1 opacity-60"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg,rgba(255,255,255,0.9) 0 2px,transparent 2px 4px,rgba(255,255,255,0.9) 4px 5px,transparent 5px 8px,rgba(255,255,255,0.9) 8px 11px,transparent 11px 13px,rgba(255,255,255,0.9) 13px 14px,transparent 14px 17px)',
                  }}
                />
                <div className="shrink-0 text-right font-mono text-[10px] text-slate-500">
                  <p className="text-purple-300/50">ID: {serial}</p>
                  <p className="mt-0.5 text-slate-600">CCNA · v1.0</p>
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
                  className="w-full rounded-r-lg border border-white/10 bg-black px-3 py-2 font-mono text-emerald-400 placeholder:text-slate-600 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
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
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-emerald-400 placeholder:text-slate-600 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* course */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-300">Course</label>
              <input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 font-mono text-emerald-400 placeholder:text-slate-600 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50"
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
