import { useState } from 'react'
import { signIn } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'
import { AuthLayout, AuthButton, authInputClass, authLinkClass } from '../components/AuthLayout.jsx'

export function SignInPage() {
  const { navigate } = useRoute()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn.email({ email, password })
      if (res.error) { setError(res.error.message || 'Sign in failed'); return }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-6 text-xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={authInputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={authInputClass} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <AuthButton type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</AuthButton>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        <button onClick={() => navigate('/forgot-password')} className={authLinkClass}>Forgot password?</button>
      </p>
      <p className="mt-2 text-center text-sm text-zinc-500">
        No account?{' '}
        <button onClick={() => navigate('/sign-up')} className={authLinkClass}>Sign up</button>
      </p>
    </AuthLayout>
  )
}
