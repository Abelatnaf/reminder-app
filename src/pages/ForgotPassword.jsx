import { useState } from 'react'
import { Bell } from 'lucide-react'
import { authClient } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'

export function ForgotPasswordPage() {
  const { navigate } = useRoute()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authClient.forgetPassword({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (res.error) { setError(res.error.message || 'Could not send reset email'); return }
      setSent(true)
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
          {sent ? (
            <div className="text-center">
              <div className="text-3xl mb-3">📬</div>
              <h1 className="text-lg font-bold mb-2">Check your inbox</h1>
              <p className="text-sm text-gray-500 mb-6">We sent a reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.</p>
              <button onClick={() => navigate('/sign-in')} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-2">Forgot password?</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 text-sm">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <p className="mt-4 text-center text-sm text-gray-500">
                <button onClick={() => navigate('/sign-in')} className="text-violet-600 dark:text-violet-400 hover:underline">
                  Back to sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
