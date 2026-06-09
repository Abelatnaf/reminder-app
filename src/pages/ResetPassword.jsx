import { useState } from 'react'
import { authClient } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'
import { AuthLayout, AuthButton, authInputClass, authLinkClass } from '../components/AuthLayout.jsx'

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
      <AuthLayout>
        <div className="text-center">
          <p className="mb-4 text-sm text-zinc-500">Invalid or expired reset link.</p>
          <button onClick={() => navigate('/forgot-password')} className={`text-sm ${authLinkClass}`}>
            Request a new one
          </button>
        </div>
      </AuthLayout>
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
    <AuthLayout>
      {done ? (
        <div className="text-center">
          <div className="mb-3 text-3xl">✅</div>
          <h1 className="mb-2 text-lg font-bold">Password updated!</h1>
          <p className="text-sm text-zinc-500">Redirecting you to sign in…</p>
        </div>
      ) : (
        <>
          <h1 className="mb-6 text-xl font-bold">Choose a new password</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus className={authInputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} className={authInputClass} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <AuthButton type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</AuthButton>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
