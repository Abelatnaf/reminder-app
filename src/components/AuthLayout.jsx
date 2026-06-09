import { AppMark } from './AppMark.jsx'

// Shared shell for the logged-out auth pages: living ambient background,
// grain overlay, brand wordmark, and a liquid-glass card.
export function AuthLayout({ children, wide = false }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="ambient" />
      <div className="grain" />
      <div className={wide ? 'w-full max-w-md' : 'w-full max-w-sm'}>
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <AppMark />
          <span className="text-xl font-bold tracking-tight">Reminders</span>
        </div>
        <div className="surface-modal rounded-3xl p-8">{children}</div>
      </div>
    </div>
  )
}

// Brand gradient submit button used across auth forms.
export function AuthButton({ children, ...props }) {
  return (
    <button
      {...props}
      style={{ background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' }}
      className="glass-sheen glow-brand w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ring-focus"
    >
      {children}
    </button>
  )
}

export const authInputClass =
  'glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100'

export const authLinkClass =
  'text-brand-600 dark:text-brand-400 hover:underline font-medium'
