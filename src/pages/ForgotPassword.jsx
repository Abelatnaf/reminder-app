import { useState } from 'react'
import { authClient } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'
import { AuthLayout, AuthButton, authInputClass, authLinkClass } from '../components/AuthLayout.jsx'

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
    <AuthLayout>
      {sent ? (
        <div className="text-center">
          <div className="mb-3 text-3xl">📬</div>
          <h1 className="mb-2 text-lg font-bold">Check your inbox</h1>
          <p className="mb-6 text-sm text-zinc-500">We sent a reset link to <strong>{email}</strong>. Check your spam folder if you don't see it.</p>
          <button onClick={() => navigate('/sign-in')} className={`text-sm ${authLinkClass}`}>Back to sign in</button>
        </div>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-bold">Forgot password?</h1>
          <p className="mb-6 text-sm text-zinc-500">Enter your email and we'll send a reset link.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus className={authInputClass} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <AuthButton type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</AuthButton>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            <button onClick={() => navigate('/sign-in')} className={authLinkClass}>Back to sign in</button>
          </p>
        </>
      )}
    </AuthLayout>
  )
}
