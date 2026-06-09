import { Zap } from 'lucide-react'
import { useRoute } from '../lib/router.jsx'

export function UpgradeGate({ message = 'This feature requires a Pro plan.', children }) {
  const { navigate } = useRoute()
  if (children) return children
  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-6 text-center">
      <Zap className="h-6 w-6 text-violet-500 mx-auto mb-3" />
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{message}</p>
      <button
        onClick={() => navigate('/billing')}
        className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
      >
        Upgrade to Pro
      </button>
    </div>
  )
}
