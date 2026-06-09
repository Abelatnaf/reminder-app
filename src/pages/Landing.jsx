import { Brain, Zap, Bell, Check } from 'lucide-react'
import { useRoute } from '../lib/router.jsx'
import { AppMark } from '../components/AppMark.jsx'

const features = [
  { icon: Brain, title: 'AI parsing', body: 'Type anything — "Call dentist Friday 3pm" — and it\'s structured automatically.' },
  { icon: Zap, title: 'Adaptive scheduling', body: 'The app learns when you actually complete tasks and nudges you toward your own patterns.' },
  { icon: Bell, title: 'Push notifications', body: 'Reminders fire even when the app is closed, on every device you use.' },
]

const plans = [
  { name: 'Free', price: '$0', features: ['Up to 10 reminders', 'Calendar + list views', 'Push notifications', 'Dark mode'] },
  { name: 'Pro', price: '$5/mo', highlight: true, features: ['Unlimited reminders', 'AI natural-language input', 'Adaptive pattern engine', 'Patterns view'] },
]

const GRADIENT = 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)'

export function Landing() {
  const { navigate } = useRoute()
  return (
    <div className="relative min-h-screen overflow-hidden text-zinc-900 dark:text-zinc-100">
      <div className="ambient" />
      <div className="grain" />

      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <AppMark /> Reminders
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/sign-in')} className="glass-pill rounded-xl px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200">Sign in</button>
          <button onClick={() => navigate('/sign-up')} style={{ background: GRADIENT }} className="glass-sheen rounded-xl px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30">Start free</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="mb-4 text-5xl font-black tracking-tight leading-[1.05]">
          Remember everything.<br />
          <span className="gradient-brand">Effortlessly.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-xl text-zinc-500 dark:text-zinc-400">
          An AI-powered reminder app that learns when you actually get things done and nudges you at exactly the right time.
        </p>
        <button
          onClick={() => navigate('/sign-up')}
          style={{ background: GRADIENT }}
          className="glass-sheen glow-brand rounded-2xl px-8 py-3.5 text-lg font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99]"
        >
          Start free — no credit card
        </button>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-4xl grid-cols-1 gap-5 px-6 pb-20 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="surface glass-glow rounded-2xl p-6">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-600/10 text-brand-600 dark:text-brand-300">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 font-semibold">{f.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-10 text-center text-3xl font-bold tracking-tight">Simple pricing</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`surface rounded-2xl p-8 ${p.highlight ? 'glow-brand ring-2 ring-brand-500/40' : ''}`}
            >
              <div className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{p.name}</div>
              <div className="mb-6 text-4xl font-black tracking-tight">{p.price}</div>
              <ul className="space-y-2.5">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-brand-500" /> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/sign-up')}
                style={p.highlight ? { background: GRADIENT } : undefined}
                className={`mt-8 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  p.highlight ? 'glass-sheen text-white shadow-md shadow-brand-600/30' : 'glass-pill text-zinc-700 dark:text-zinc-200'
                }`}
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
