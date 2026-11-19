import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            S
          </span>
          <span className="text-lg font-semibold text-slate-900">SubnetMaster</span>
          {profile?.is_pro && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Pro
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
