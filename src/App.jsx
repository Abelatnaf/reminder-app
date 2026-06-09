import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { initOfflineSync } from './lib/offlineQueue.js'
import { Info, X } from 'lucide-react'
import { useSession } from './lib/auth.js'
import { useReminders } from './hooks/useReminders.js'
import { useTheme } from './hooks/useTheme.js'
import { useHotkeys } from './hooks/useHotkeys.js'
import { useDueNotifications } from './hooks/useDueNotifications.js'
import { usePush } from './hooks/usePush.js'
import { useRoute } from './lib/router.jsx'
import { api } from './lib/api.js'
import { PRIORITY, formatDue } from './lib/format.js'
import { Header } from './components/Header.jsx'
import { ReminderInput } from './components/ReminderInput.jsx'
import { ReminderList } from './components/ReminderList.jsx'
import { CalendarMonth } from './components/CalendarMonth.jsx'
import { CalendarDay } from './components/CalendarDay.jsx'
import { CategoryFilter } from './components/CategoryFilter.jsx'
import { ReminderFormModal } from './components/ReminderFormModal.jsx'
import { HelpOverlay } from './components/HelpOverlay.jsx'
import { Stats } from './pages/Stats.jsx'
import { Settings } from './pages/Settings.jsx'
import { Landing } from './pages/Landing.jsx'
import { SignInPage } from './pages/SignIn.jsx'
import { SignUpPage } from './pages/SignUp.jsx'
import { ForgotPasswordPage } from './pages/ForgotPassword.jsx'
import { ResetPasswordPage } from './pages/ResetPassword.jsx'
import InstallBanner from './components/InstallBanner.jsx'

export default function App() {
  const { path } = useRoute()
  const { data: session, isPending } = useSession()

  if (path === '/sign-in') return <SignInPage />
  if (path === '/sign-up') return <SignUpPage />
  if (path === '/forgot-password') return <ForgotPasswordPage />
  if (path === '/reset-password') return <ResetPasswordPage />

  if (isPending) return (
    <div className="flex min-h-screen items-center justify-center text-gray-400 text-sm">Loading…</div>
  )

  if (!session) return <Landing />

  return <AppShell />
}

// Sort a list by the chosen key. Done items always sink to the bottom.
function sortReminders(list, sort) {
  const copy = [...list]
  copy.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    switch (sort) {
      case 'priority':
        return (PRIORITY[a.priority]?.order ?? 1) - (PRIORITY[b.priority]?.order ?? 1)
      case 'created':
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      case 'title':
        return a.title.localeCompare(b.title)
      case 'due':
      default: {
        const at = a.datetime ? new Date(a.datetime).getTime() : Infinity
        const bt = b.datetime ? new Date(b.datetime).getTime() : Infinity
        return at - bt
      }
    }
  })
  return copy
}

const notHidden = (r) => !(r.hiddenUntil && new Date(r.hiddenUntil).getTime() > Date.now())

function AppShell() {
  const { reminders, loading, create, update, act, toggle, remove, reload } = useReminders()
  const { theme, toggle: toggleTheme } = useTheme()
  const { path, navigate } = useRoute()

  const [view, setView] = useState('month')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('active')
  const [sort, setSort] = useState('due')
  const [selectedId, setSelectedId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formInitial, setFormInitial] = useState(null)
  const editingId = useRef(null)

  const [parsing, setParsing] = useState(false)
  const push = usePush()
  const [health, setHealth] = useState({ mode: 'local', aiConfigured: false, notionConfigured: false })
  const [bannerHidden, setBannerHidden] = useState(false)
  const [timeSuggestions, setTimeSuggestions] = useState({}) // {id: {hour,label}|null}
  const inputRef = useRef(null)

  // Flush offline queue and reload when device reconnects
  useEffect(() => {
    initOfflineSync(({ sent }) => {
      toast.success(`Back online — ${sent} change${sent === 1 ? '' : 's'} synced`)
      reload()
    })
  }, [reload])

  // Real push (fires when the app is closed) is primary; the in-page notifier is
  // only a fallback for users who haven't enabled push — gated so it can't double-fire.
  const inPageNotif = !push.subscribed && push.permission === 'granted'
  useDueNotifications(reminders, inPageNotif)

  // Fetch health, retrying while the backend is still booting. On the first
  // success, refresh reminders too (the initial load may have raced the server).
  useEffect(() => {
    let cancelled = false
    let tries = 0
    let gotIt = false
    const tick = () => {
      api
        .health()
        .then((h) => {
          if (cancelled) return
          setHealth(h)
          if (!gotIt) {
            gotIt = true
            reload()
          }
        })
        .catch(() => {
          if (!cancelled && tries++ < 12) setTimeout(tick, 800)
        })
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [reload])

  // ── Derived lists ─────────────────────────────────────────────────────────
  const base = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reminders.filter((r) => {
      if (status === 'active') {
        if (r.done) return false
        if (!notHidden(r)) return false
      }
      if (status === 'done' && !r.done) return false
      if (q && !`${r.title} ${r.notes}`.toLowerCase().includes(q)) return false
      if (categoryFilter && r.category !== categoryFilter) return false
      return true
    })
  }, [reminders, status, query, categoryFilter])

  const listVisible = useMemo(() => sortReminders(base, sort), [base, sort])
  const calendarItems = useMemo(
    () => reminders.filter((r) => notHidden(r) && (!categoryFilter || r.category === categoryFilter)),
    [reminders, categoryFilter]
  )
  const navList = view === 'list' ? listVisible : calendarItems

  const counts = useMemo(
    () => ({
      active: reminders.filter((r) => !r.done).length,
      all: reminders.length,
      done: reminders.filter((r) => r.done).length,
    }),
    [reminders]
  )

  // Fetch engine time-suggestions for reminders with enough logged events.
  useEffect(() => {
    const qualifying = reminders.filter((r) => (r.dismissalEvents?.length || 0) >= 3 && !r.done && !r.rescheduledByEngine)
    if (!qualifying.length) {
      setTimeSuggestions({})
      return
    }
    let cancelled = false
    Promise.all(
      qualifying.map(async (r) => {
        try {
          const res = await api.suggestTime(r.id)
          return [r.id, res.suggestion]
        } catch {
          return [r.id, null]
        }
      })
    ).then((entries) => {
      if (!cancelled) setTimeSuggestions(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [reminders])

  // ── Create / edit ─────────────────────────────────────────────────────────
  const openCreate = useCallback((initial) => {
    editingId.current = null
    setFormMode('create')
    setFormInitial(initial || null)
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((reminder) => {
    editingId.current = reminder.id
    setFormMode('edit')
    setFormInitial(reminder)
    setFormOpen(true)
  }, [])

  // Proactive nudge: right after a deliberate create, ask the engine whether the
  // user's cohort tends to finish at a different hour and offer a one-tap move.
  const proposeBetterTime = useCallback(
    async (created) => {
      if (!created?.id || !created.datetime) return
      try {
        const { suggestion } = await api.suggestTime(created.id)
        if (!suggestion) return
        if (suggestion.hour === new Date(created.datetime).getHours()) return // already optimal
        const apply = () => {
          const target = new Date(created.datetime)
          target.setHours(suggestion.hour, 0, 0, 0) // keep the chosen day, shift the hour
          update(created.id, { datetime: target.toISOString(), rescheduledByEngine: true, rescheduleDate: new Date().toISOString() })
            .then(() => toast.success(`Moved to ${suggestion.label}`))
            .catch(() => {})
        }
        const cohort = (PRIORITY[created.priority]?.label || created.priority).toLowerCase()
        toast('Better time?', {
          description: `You usually finish ${cohort}-priority reminders around ${suggestion.label}.`,
          action: { label: `Use ${suggestion.label}`, onClick: apply },
        })
      } catch {
        /* a missing suggestion is fine — stay quiet */
      }
    },
    [update]
  )

  const handleFormSubmit = useCallback(
    async (fields) => {
      if (formMode === 'edit' && editingId.current) {
        await update(editingId.current, fields)
        return
      }
      const created = await create(fields)
      proposeBetterTime(created)
    },
    [formMode, create, update, proposeBetterTime]
  )

  const onQuickAdd = useCallback(
    (date) => {
      // CalendarDay passes the exact hour; CalendarMonth passes a day (use 9am default)
      const d = new Date(date)
      const hasHour = d.getHours() !== 0 || d.getMinutes() !== 0
      if (!hasHour) d.setHours(9, 0, 0, 0)
      openCreate({ datetime: d.toISOString() })
    },
    [openCreate]
  )

  // Apply an engine suggestion: this hour today if still future, else tomorrow.
  const onReschedule = useCallback(
    async (reminder, suggestion) => {
      const target = new Date()
      target.setHours(suggestion.hour, 0, 0, 0)
      if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1)
      try {
        await update(reminder.id, {
          datetime: target.toISOString(),
          rescheduledByEngine: true,
          rescheduleDate: new Date().toISOString(),
        })
        toast.success(`Rescheduled to ${suggestion.label}`)
      } catch {
        /* hook already toasted */
      }
    },
    [update]
  )

  // ── AI parse ──────────────────────────────────────────────────────────────
  const handleParse = useCallback(
    async (text, { review = false, onDone } = {}) => {
      if (!health.aiConfigured) {
        onDone?.()
        openCreate({ title: text }) // no AI → straight to the manual form
        return
      }
      setParsing(true)
      try {
        const parsed = await api.parse(text)
        onDone?.()
        if (review) {
          openCreate(parsed) // user asked to tweak before saving
          return
        }
        // Quick capture: save immediately, with an Undo escape hatch.
        const created = await create(parsed, { silent: true })
        const title = parsed.title.length > 40 ? `${parsed.title.slice(0, 39)}…` : parsed.title
        toast.success(`Added “${title}”`, {
          description: parsed.datetime ? formatDue(parsed.datetime).label : 'No date set',
          action: { label: 'Undo', onClick: () => remove(created.id) },
        })
      } catch (err) {
        toast.error(err.message || 'Could not parse that — fill it in manually.')
        openCreate({ title: text })
      } finally {
        setParsing(false)
      }
    },
    [health.aiConfigured, openCreate, create, remove]
  )

  // ── Notifications ─────────────────────────────────────────────────────────
  const toggleNotifications = useCallback(async () => {
    if (push.subscribed) {
      await push.unsubscribe()
      toast('Alerts paused')
      return
    }
    if (push.needsInstall) {
      toast('Add to Home Screen first', {
        description: 'On iPhone/iPad, install the app (Share → Add to Home Screen) to turn on alerts.',
      })
      return
    }
    const res = await push.subscribe()
    if (res === 'granted') toast.success('Alerts on — you’ll be reminded even when the app is closed')
    else if (res === 'denied') toast.error('Notification permission was blocked')
    else if (res === 'unsupported') toast.error('Notifications aren’t supported on this browser')
    else toast.error('Could not enable alerts — try again')
  }, [push])

  // ── Keyboard selection ────────────────────────────────────────────────────
  const selectAndScroll = useCallback((id) => {
    setSelectedId(id)
    requestAnimationFrame(() => {
      document.querySelector(`[data-rid="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [])

  const moveSelection = useCallback(
    (dir) => {
      if (navList.length === 0) return
      const idx = navList.findIndex((r) => r.id === selectedId)
      const nextIdx = idx === -1 ? 0 : Math.min(navList.length - 1, Math.max(0, idx + dir))
      selectAndScroll(navList[nextIdx].id)
    },
    [navList, selectedId, selectAndScroll]
  )

  const selected = useMemo(() => reminders.find((r) => r.id === selectedId) || null, [reminders, selectedId])

  const { helpOpen, setHelpOpen } = useHotkeys({
    focusInput: () => inputRef.current?.focus(),
    viewList: () => setView('list'),
    viewCalendar: () => setView('month'),
    moveSelection,
    toggleSelected: () => selected && toggle(selected),
    editSelected: () => selected && openEdit(selected),
    deleteSelected: () => selected && remove(selected.id),
  })

  // Props for a ReminderCard, bound to one reminder.
  const cardProps = useCallback(
    (r) => ({
      reminder: r,
      selected: selectedId === r.id,
      onSelect: () => setSelectedId(r.id),
      onToggle: () => toggle(r),
      onSnooze: () => act(r, 'snooze'),
      onLater: () => act(r, 'not_now'),
      onEdit: () => openEdit(r),
      onDelete: () => remove(r.id),
      suggestion: timeSuggestions[r.id] || null,
      onReschedule: (s) => onReschedule(r, s),
    }),
    [selectedId, toggle, act, openEdit, remove, timeSuggestions, onReschedule]
  )

  // ── Route handling ────────────────────────────────────────────────────────
  if (path === '/stats') return <Stats onBack={() => navigate('/')} />
  if (path === '/settings') return <Settings onBack={() => navigate('/')} />

  const notionIssue =
    !health.notionConfigured || (health.notionConfigured && health.mode !== 'notion')
  const showBanner = !bannerHidden && (!health.aiConfigured || notionIssue)

  return (
    <div className="mx-auto min-h-full w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <Header
        view={view}
        onView={setView}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenStats={() => navigate('/stats')}
        onOpenSettings={() => navigate('/settings')}
        notif={{ supported: push.supported || push.needsInstall, permission: push.permission, enabled: push.subscribed, onToggle: toggleNotifications }}
        health={health}
      />

      {showBanner && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-brand-200/70 bg-brand-50/70 px-4 py-3 text-sm dark:border-brand-500/20 dark:bg-brand-500/10">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <p className="flex-1 text-brand-900/90 dark:text-brand-100/90">
            {health.notionConfigured && health.mode !== 'notion' ? (
              <>
                Notion is configured but the server is in <strong>local</strong> mode (sync failed). Stop every{' '}
                <code className="rounded bg-brand-100 px-1 dark:bg-brand-500/20">npm run dev</code> window, start it once, and refresh.
              </>
            ) : (
              <>
                Running in <strong>{health.mode === 'notion' ? 'Notion' : 'local'}</strong> mode.
                {!health.notionConfigured && ' Add NOTION_TOKEN to sync with Notion.'}
                {!health.aiConfigured && ' Add GROQ_API_KEY to enable AI parsing & suggestions.'}{' '}
                See <code className="rounded bg-brand-100 px-1 dark:bg-brand-500/20">.env.example</code>, then restart.
              </>
            )}
          </p>
          <button onClick={() => setBannerHidden(true)} aria-label="Dismiss" className="rounded p-0.5 text-brand-500/70 hover:text-brand-700 dark:hover:text-brand-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-6">
        <ReminderInput ref={inputRef} onParse={handleParse} onManual={() => openCreate()} parsing={parsing} aiEnabled={health.aiConfigured} />
      </div>

      <div className="mt-6">
        <CategoryFilter active={categoryFilter} onChange={setCategoryFilter} />
      </div>

      <main className="mt-6">
        {view === 'month' && (
          <CalendarMonth reminders={calendarItems} onQuickAdd={onQuickAdd} cardProps={cardProps} />
        )}
        {view === 'day' && (
          <CalendarDay reminders={calendarItems} onQuickAdd={onQuickAdd} cardProps={cardProps} />
        )}
        {view === 'list' && (
          <ReminderList
            visible={listVisible}
            loading={loading}
            counts={counts}
            filter={{ query, onQuery: setQuery, status, onStatus: setStatus, sort, onSort: setSort }}
            isFiltered={Boolean(query.trim()) || status !== 'active' || Boolean(categoryFilter)}
            cardProps={cardProps}
          />
        )}
      </main>

      <ReminderFormModal open={formOpen} onOpenChange={setFormOpen} mode={formMode} initial={formInitial} onSubmit={handleFormSubmit} />
      <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} />
      <InstallBanner />
    </div>
  )
}
