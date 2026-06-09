import { useState } from 'react'
import { Bell } from 'lucide-react'
import { authClient } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'

export function ResetPasswordPage() {
  const { navigate } = useRoute()
  const token = new URLSearchParams(window.location.search).get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Invalid or expired reset link.</p>
          <button onClick={() => navigate('/forgot-password')} className="text-sm text-violet-600 hover:underline">
            Request a new one
          </button>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authClient.resetPassword({ newPassword: password, token })
      if (res.error) { setError(res.error.message || 'Reset failed'); return }
      setDone(true)
      setTimeout(() => navigate('/sign-in'), 2500)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Bell className="h-6 w-6 text-violet-500" />
          <span className="text-xl font-bold">Reminder</span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          {done ? (
            <div className="text-center">
              <div className="text-3xl mb-3">✅</div>
              <h1 className="text-lg font-bold mb-2">Password updated!</h1>
              <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-6">Choose a new password</h1>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">New password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Confirm password</label>
                  <input
                    type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 text-sm">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
