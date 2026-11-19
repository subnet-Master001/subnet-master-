import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Best-effort fetch of the user's profile row. The app keeps working even
  // if the profiles table or RLS policy isn't accessible with the anon key.
  async function fetchProfile(user) {
    if (!user) {
      setProfile(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, is_pro, questions_used_today, last_active_date')
        .eq('id', user.id)
        .maybeSingle()
      if (!error && data) setProfile(data)
      else setProfile(null)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) fetchProfile(data.session.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setLoading(false)
      if (newSession?.user) fetchProfile(newSession.user)
      else setProfile(null)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn: (creds) => supabase.auth.signInWithPassword(creds),
    signUp: (creds) => supabase.auth.signUp(creds),
    signOut: () => supabase.auth.signOut(),
    refreshProfile: () => fetchProfile(session?.user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
