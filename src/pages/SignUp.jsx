import { useState } from 'react'
import { signUp } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'
import { AuthLayout, AuthButton, authInputClass, authLinkClass } from '../components/AuthLayout.jsx'

export function SignUpPage() {
  const { navigate } = useRoute()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signUp.email({ name, email, password })
      if (res.error) { setError(res.error.message || 'Sign up failed'); return }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="mb-6 text-xl font-bold">Create account</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className={authInputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={authInputClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-500 dark:text-zinc-400">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={authInputClass} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <AuthButton type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</AuthButton>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <button onClick={() => navigate('/sign-in')} className={authLinkClass}>Sign in</button>
      </p>
    </AuthLayout>
  )
}
