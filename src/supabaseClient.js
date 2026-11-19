import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[SubnetMaster] Supabase env vars are missing. Add VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY to your .env file (see .env.example).'
  )
}

// Fall back to placeholders so the app still imports/builds when the env vars
// are not yet set. Replace them in .env with your real project credentials.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)

export default supabase
