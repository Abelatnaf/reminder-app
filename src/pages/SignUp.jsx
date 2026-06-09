import { useState } from 'react'
import { Bell } from 'lucide-react'
import { signUp } from '../lib/auth.js'
import { useRoute } from '../lib/router.jsx'

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Bell className="h-6 w-6 text-violet-500" />
          <span className="text-xl font-bold">Reminder</span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <h1 className="text-xl font-bold mb-6">Create account</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 text-sm">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={() => navigate('/sign-in')} className="text-violet-600 dark:text-violet-400 hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  )
}
