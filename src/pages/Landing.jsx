import { Bell, Brain, Zap, Check } from 'lucide-react'
import { useRoute } from '../lib/router.jsx'

const features = [
  { icon: Brain, title: 'AI parsing', body: 'Type anything — "Call dentist Friday 3pm" — and it\'s structured automatically.' },
  { icon: Brain, title: 'Adaptive scheduling', body: 'The app learns when you actually complete tasks and nudges you toward your own patterns.' },
  { icon: Bell, title: 'Push notifications', body: 'Reminders fire even when the app is closed, on every device you use.' },
]

const plans = [
  { name: 'Free', price: '$0', features: ['Up to 10 reminders', 'Calendar + list views', 'Push notifications', 'Dark mode'] },
  { name: 'Pro', price: '$5/mo', highlight: true, features: ['Unlimited reminders', 'AI natural-language input', 'Adaptive pattern engine', 'Patterns view'] },
]

export function Landing() {
  const { navigate } = useRoute()
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Bell className="h-5 w-5 text-violet-500" /> Reminder
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/sign-in')} className="px-4 py-1.5 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Sign in</button>
          <button onClick={() => navigate('/sign-up')} className="px-4 py-1.5 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700">Start free</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-24 max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight mb-4">Remember everything.<br />Effortlessly.</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-10">An AI-powered reminder app that learns when you actually get things done and nudges you at exactly the right time.</p>
        <button onClick={() => navigate('/sign-up')} className="px-8 py-3 rounded-xl bg-violet-600 text-white font-medium text-lg hover:bg-violet-700 shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
          Start free — no credit card
        </button>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <f.icon className="h-6 w-6 text-violet-500 mb-3" />
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="px-6 pb-24 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">Simple pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl border p-8 ${p.highlight ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30' : 'border-gray-200 dark:border-gray-800'}`}>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{p.name}</div>
              <div className="text-4xl font-bold mb-6">{p.price}</div>
              <ul className="space-y-2">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-violet-500 shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(p.highlight ? '/sign-up' : '/sign-up')}
                className={`mt-8 w-full py-2 rounded-lg text-sm font-medium ${p.highlight ? 'bg-violet-600 text-white hover:bg-violet-700' : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {p.highlight ? 'Get Pro' : 'Start free'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
