import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
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
  const cardRef = useRef(null)

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
  const [downloading, setDownloading] = useState(false)

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

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      // pixelRatio: 2 → 2× resolution for crisp social-media sharing.
      // backgroundColor ensures no transparent pixels in the PNG even if
      // Tailwind opacity utilities leave parts see-through in html-to-image.
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#06061a',
        cacheBust: true,
      })
      const link = document.createElement('a')
      link.download = 'SubnetMaster-ID.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
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
          {/* ───────────── Player ID Card ───────────── */}
          <div className="flex flex-col gap-3">
            {/* The ref wraps only the visual card so the download crops perfectly */}
            <div
              ref={cardRef}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >

            {/* ── top blue band ── */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-[10px] font-black text-white">
                    S
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white">
                    SubnetMaster
                  </span>
                  <span className="font-mono text-[11px] text-white/40">·</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blue-200">
                    Player ID
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Network Online
                </span>
              </div>
            </div>

            {/* ── body grid: avatar col | details col ── */}
            <div className="grid grid-cols-[140px_1fr] gap-4 p-5">

              {/* left col — avatar + codename */}
              <div className="flex flex-col items-center gap-3">
                {/* circular avatar — keep the purple glow for the gaming feel */}
                <div className="relative">
                  <div className="absolute -inset-[3px] rounded-full bg-purple-500 opacity-70 blur-[6px]" />
                  <div className="absolute -inset-[3px] rounded-full ring-2 ring-purple-500" />
                  <div className="relative h-[132px] w-[132px] overflow-hidden rounded-full bg-slate-100">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-black text-slate-400">
                        {codename ? codename[0].toUpperCase() : 'S'}
                      </div>
                    )}
                  </div>
                </div>
                {/* codename under avatar */}
                <div className="text-center">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Operator
                  </p>
                  <p className="mt-0.5 break-all font-mono text-sm font-black leading-tight text-slate-900">
                    Subnet<span className="text-indigo-600">{codename || '???'}</span>
                  </p>
                </div>
              </div>

              {/* right col — details box */}
              <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4">

                {/* clearance level */}
                <div>
                  <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Clearance Level
                  </p>
                  <span className="inline-flex">
                    <RankBadge score={usedToday} />
                  </span>
                </div>

                <div className="border-t border-slate-200" />

                {/* school */}
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    School
                  </p>
                  <p className={`mt-0.5 text-sm font-medium ${school ? 'text-slate-900' : 'text-slate-300'}`}>
                    {school || '—'}
                  </p>
                </div>

                {/* course */}
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Course
                  </p>
                  <p className={`mt-0.5 text-sm font-medium ${course ? 'text-slate-900' : 'text-slate-300'}`}>
                    {course || '—'}
                  </p>
                </div>

                {/* joined */}
                {joinedLabel && (
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Member Since
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                      {joinedLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── bottom blue band with barcode ── */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 py-3">
              <div className="flex items-center gap-4">
                {/* chip contacts */}
                <div className="shrink-0">
                  <div
                    className="h-9 w-7 rounded-sm"
                    style={{
                      background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 40%, #f1f5f9 60%, #cbd5e1 100%)',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 1px 3px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div className="mt-[11px] flex flex-col items-center gap-[3px]">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-px w-5 rounded-full bg-slate-500/40" />
                      ))}
                    </div>
                  </div>
                </div>
                {/* barcode — white bars on blue band */}
                <div
                  aria-hidden="true"
                  className="h-7 flex-1"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg,rgba(255,255,255,0.9) 0 1.5px,transparent 1.5px 3px,rgba(255,255,255,0.9) 3px 4px,transparent 4px 6.5px,rgba(255,255,255,0.9) 6.5px 8px,transparent 8px 10px,rgba(255,255,255,0.9) 10px 11.5px,transparent 11.5px 14px,rgba(255,255,255,0.9) 14px 15px,transparent 15px 18px)',
                  }}
                />
                {/* serial */}
                <div className="shrink-0 text-right font-mono text-[10px] leading-relaxed">
                  <p className="text-white/90">ID: {serial}</p>
                  {joinedLabel && <p className="text-blue-200/70">JOINED: {joinedLabel}</p>}
                  <p className="text-blue-200/50">CCNA · v1.0</p>
                </div>
              </div>
            </div>

            </div>{/* end cardRef */}

            {/* ── Download button ── */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-indigo-400 hover:to-purple-500 hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                // Download arrow icon
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
              )}
              {downloading ? 'Generating…' : 'Download ID Card'}
            </button>
          </div>{/* end card column wrapper */}

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
