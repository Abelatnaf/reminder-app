import { useEffect, useState } from 'react'
import { ArrowLeft, Bell, BellOff, LogOut, Trash2, Calendar, RefreshCw, Unlink, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { useSession, signOut } from '../lib/auth.js'
import { usePush } from '../hooks/usePush.js'
import { api } from '../lib/api.js'
import { useRoute } from '../lib/router.jsx'
import { toast } from 'sonner'

export function Settings({ onBack }) {
  const { data: session } = useSession()
  const push = usePush()
  const { navigate, path } = useRoute()
  const [deleting, setDeleting] = useState(false)

  // Google Calendar state
  const [gcal, setGcal] = useState({ configured: false, connected: false, email: null, pushEnabled: false })
  const [gcalLoading, setGcalLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Load gcal status on mount + handle callback query params
  useEffect(() => {
    api.gcal.status().then(setGcal).catch(() => {}).finally(() => setGcalLoading(false))

    // Show toast if returning from Google OAuth callback
    const params = new URLSearchParams(window.location.search)
    const gcalParam = params.get('gcal')
    if (gcalParam === 'connected') {
      toast.success('Google Calendar connected!')
      window.history.replaceState({}, '', '/settings')
      api.gcal.status().then(setGcal).catch(() => {})
    } else if (gcalParam === 'error') {
      const msg = params.get('msg') || 'Could not connect Google Calendar'
      toast.error(msg)
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  const toggleNotifications = async () => {
    if (push.subscribed) {
      await push.unsubscribe()
      toast('Alerts paused')
    } else {
      const res = await push.subscribe()
      if (res === 'granted') toast.success('Alerts on')
      else if (res === 'denied') toast.error('Notification permission was blocked')
    }
  }

  const deleteAll = async () => {
    if (!confirm('Delete all your reminders? This cannot be undone.')) return
    setDeleting(true)
    try {
      const reminders = await api.list()
      await Promise.all(reminders.map((r) => api.remove(r.id)))
      toast.success('All reminders deleted')
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
  }

  const handleGcalSync = async () => {
    setSyncing(true)
    try {
      const { synced, total } = await api.gcal.sync()
      toast.success(synced > 0 ? `Imported ${synced} new event${synced === 1 ? '' : 's'} from Google Calendar` : `All ${total} upcoming events already imported`)
    } catch (err) {
      toast.error(err.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleGcalDisconnect = async () => {
    if (!confirm('Disconnect Google Calendar? Imported reminders will remain.')) return
    setDisconnecting(true)
    try {
      await api.gcal.disconnect()
      setGcal((g) => ({ ...g, connected: false, email: null }))
      toast('Google Calendar disconnected')
    } catch (err) {
      toast.error(err.message || 'Could not disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  const user = session?.user

  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      {/* Account */}
      <section className="surface mb-4 rounded-2xl p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Account</h2>
        <div className="text-sm text-zinc-700 dark:text-zinc-300">{user?.email}</div>
        {user?.name && <div className="mt-0.5 text-xs text-zinc-400">{user.name}</div>}
        <div className="mt-1 text-xs text-zinc-400">
          Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
        </div>
      </section>

      {/* Notifications */}
      <section className="surface mb-4 rounded-2xl p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Push alerts</div>
            <div className="mt-0.5 text-xs text-zinc-400">Fire even when the app is closed</div>
          </div>
          <button
            onClick={toggleNotifications}
            className={`glass-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              push.subscribed
                ? 'text-violet-700 dark:text-violet-300'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {push.subscribed ? <><Bell className="h-4 w-4" /> On</> : <><BellOff className="h-4 w-4" /> Off</>}
          </button>
        </div>
      </section>

      {/* Google Calendar */}
      <section className="surface mb-4 rounded-2xl p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Google Calendar</h2>

        {!gcal.configured && !gcalLoading && (
          <div className="glass-pill flex items-start gap-2 rounded-xl p-3 text-sm text-zinc-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              Google Calendar is not configured. Add <code className="rounded bg-zinc-200 dark:bg-zinc-700 px-1 text-xs">GOOGLE_CLIENT_ID</code>{' '}
              and <code className="rounded bg-zinc-200 dark:bg-zinc-700 px-1 text-xs">GOOGLE_CLIENT_SECRET</code> to{' '}
              <code className="rounded bg-zinc-200 dark:bg-zinc-700 px-1 text-xs">.env</code> and restart the server.
            </span>
          </div>
        )}

        {gcal.configured && !gcal.connected && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Connect Google Calendar</div>
              <div className="mt-0.5 text-xs text-zinc-400">Import upcoming events as reminders</div>
            </div>
            <a
              href={api.gcal.authUrl}
              className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              <Calendar className="h-4 w-4" /> Connect
            </a>
          </div>
        )}

        {gcal.configured && gcal.connected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div>
                <div className="text-sm font-medium">Connected</div>
                {gcal.email && <div className="text-xs text-zinc-400">{gcal.email}</div>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGcalSync}
                disabled={syncing}
                className="glass-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-50 dark:text-zinc-300"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={handleGcalDisconnect}
                disabled={disconnecting}
                className="glass-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 disabled:opacity-50 dark:text-zinc-400"
              >
                <Unlink className="h-4 w-4" />
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
            <div className="glass-pill flex items-center justify-between rounded-xl px-3 py-2.5">
              <div>
                <div className="text-sm font-medium">Push new reminders to Google Calendar</div>
                <div className="mt-0.5 text-xs text-zinc-400">Auto-add reminders with a date to your calendar</div>
              </div>
              <button
                onClick={async () => {
                  const next = !gcal.pushEnabled
                  setGcal((g) => ({ ...g, pushEnabled: next }))
                  try {
                    await api.gcal.setSettings({ pushEnabled: next })
                    toast.success(next ? 'New reminders will sync to Google Calendar' : 'Push sync disabled')
                  } catch {
                    setGcal((g) => ({ ...g, pushEnabled: !next }))
                    toast.error('Could not update setting')
                  }
                }}
                style={gcal.pushEnabled ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ring-focus ${gcal.pushEnabled ? '' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                role="switch" aria-checked={gcal.pushEnabled}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${gcal.pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Sync imports upcoming events (next 30 days) from your primary Google Calendar. Already-imported events are skipped.
            </p>
          </div>
        )}
      </section>

      {/* Export */}
      <section className="surface mb-4 rounded-2xl p-6">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Export data</h2>
        <p className="mb-4 text-xs text-zinc-400">Download all your reminders to use anywhere.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => api.export.csv().catch(() => toast.error('Export failed'))}
            className="glass-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() => api.export.ics().catch(() => toast.error('Export failed'))}
            className="glass-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <Download className="h-4 w-4" /> iCal (.ics)
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="surface rounded-2xl p-6 ring-1 ring-red-200/60 dark:ring-red-900/40">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-red-500">Danger zone</h2>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Delete all reminders</div>
            <div className="mt-0.5 text-xs text-zinc-400">Permanently removes every reminder</div>
          </div>
          <button onClick={deleteAll} disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30">
            <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : 'Delete all'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Sign out</div>
            <div className="mt-0.5 text-xs text-zinc-400">Sign out of this browser</div>
          </div>
          <button onClick={handleSignOut}
            className="glass-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
