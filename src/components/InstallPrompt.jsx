import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'pwa-install-dismissed'

// Shows a one-time "Install app" hint when the browser fires beforeinstallprompt (Chrome/Edge).
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    setDeferred(null)
    dismiss()
  }

  if (hidden || !deferred) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/95 sm:left-auto sm:right-6">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Install Calendar</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Add to your home screen for a full-screen app.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white ring-focus"
      >
        Install
      </button>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded p-1 text-zinc-400 ring-focus hover:text-zinc-600 dark:hover:text-zinc-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
