import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../supabaseClient.js'

// The "Subnet" prefix is a fixed part of every player's codename. We store the
// full handle (e.g. "SubnetBeast") and strip the prefix when populating the
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
          .select('id, email, codename, school, course, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
        if (active && !error && data) {
          setCodename(stripPrefix(data.codename))
          setSchool(data.school ?? '')
          setCourse(data.course ?? '')
          setAvatarUrl(data.avatar_url ?? null)
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
      setMessage('Profile saved!')
    } catch (err) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading…
        </div>
      </div>
    )
  }

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Player Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Customize how you appear on the leaderboard.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-2xl backdrop-blur-md sm:p-8"
        >
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-400">
                  {codename ? codename[0].toUpperCase() : '?'}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
              <p className="mt-1 text-xs text-slate-400">PNG, JPG or GIF.</p>
            </div>
          </div>

          {/* Codename with fixed Subnet prefix */}
          <div className="mt-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Codename
            </label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500">
                Subnet
              </span>
              <input
                value={codename}
                onChange={(e) => setCodename(e.target.value)}
                placeholder="Beast"
                maxLength={24}
                className="w-full rounded-r-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your handle: <span className="font-mono text-slate-500">Subnet{codename || 'Beast'}</span>
            </p>
          </div>

          {/* School */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">School</label>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. Lagos State University"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Course */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
