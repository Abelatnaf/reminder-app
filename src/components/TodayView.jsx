import { useMemo } from 'react'
import { isPast, isToday, format } from 'date-fns'
import { AlertTriangle, Clock4, Inbox, CheckCircle2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ReminderCard } from './ReminderCard.jsx'
import { cn } from '../lib/cn.js'

// ── Gradient hero card ─────────────────────────────────────────────────────────
function HeroCard({ now, doneToday, total, allDone, isEmpty }) {
  const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] text-white"
      style={{ background: 'linear-gradient(135deg, #c01a10 0%, #e62216 35%, #ff4b3a 70%, #ff7043 100%)' }}>

      {/* Ambient glow circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-40 w-40 rounded-full bg-rose-200/10 blur-2xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-24 w-24 rounded-full bg-orange-300/10 blur-xl" />

      <div className="relative px-6 pb-6 pt-6">
        {/* Row 1: date + count */}
        <div className="flex items-start justify-between gap-4">
          <div className="leading-none">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
              {format(now, 'EEEE · MMMM yyyy')}
            </p>
            <h2 className="mt-1 text-[3.75rem] font-black leading-none tracking-tighter">
              {format(now, 'd')}
            </h2>
          </div>

          {total > 0 && (
            <div className="mt-1 text-right">
              <p className="text-[2.25rem] font-black tabular-nums leading-none">
                {doneToday}
                <span className="text-lg font-semibold text-white/50">/{total}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/55">
                {allDone ? 'All done!' : 'completed'}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-5">
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-semibold text-white/50">
              <span>{pct}% complete</span>
              {!allDone && <span>{total - doneToday} remaining</span>}
            </div>
          </div>
        )}

        {/* Empty state inside hero */}
        {isEmpty && (
          <p className="mt-4 text-sm font-medium text-white/60">
            Clear for today — add something to get started.
          </p>
        )}

        {/* All done inside hero */}
        {allDone && (
          <p className="mt-4 text-sm font-semibold text-white/80">
            You crushed it today. Enjoy the rest of your day.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function Section({ icon: Icon, label, count, variant, children }) {
  const styles = {
    overdue: { text: 'text-red-500 dark:text-red-400',  badge: 'bg-red-500'  },
    today:   { text: 'text-sky-500 dark:text-sky-400',  badge: 'bg-sky-500'  },
    inbox:   { text: 'text-zinc-500 dark:text-zinc-400', badge: 'bg-zinc-400 dark:bg-zinc-600' },
  }
  const s = styles[variant]

  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', s.text)} />
        <span className={cn('text-[11px] font-bold uppercase tracking-[0.09em]', s.text)}>
          {label}
        </span>
        {count > 0 && (
          <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white', s.badge)}>
            {count}
          </span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-zinc-200/80 to-transparent dark:from-white/8 dark:to-transparent" />
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </div>
    </div>
  )
}

// ── Today view ─────────────────────────────────────────────────────────────────
export function TodayView({ reminders, cardProps }) {
  const { overdue, dueToday, doneToday, inbox } = useMemo(() => {
    const overdue = [], dueToday = [], doneToday = [], inbox = []
    for (const r of reminders) {
      if (!r.datetime) { if (!r.done) inbox.push(r); continue }
      const dt = new Date(r.datetime)
      if (r.done) { if (isToday(dt)) doneToday.push(r); continue }
      if (isToday(dt))     dueToday.push(r)
      else if (isPast(dt)) overdue.push(r)
    }
    dueToday.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    overdue.sort((a, b)  => new Date(a.datetime) - new Date(b.datetime))
    return { overdue, dueToday, doneToday, inbox }
  }, [reminders])

  const total   = overdue.length + dueToday.length + doneToday.length
  const allDone = total > 0 && doneToday.length === total
  const isEmpty = total === 0 && inbox.length === 0
  const now     = new Date()

  return (
    <div className="space-y-6">
      {/* Hero */}
      <HeroCard
        now={now}
        doneToday={doneToday.length}
        total={total}
        allDone={allDone}
        isEmpty={isEmpty}
      />

      {/* All-done celebration below hero */}
      {allDone && inbox.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200/50 bg-emerald-50/60 py-8 text-center backdrop-blur-sm dark:border-emerald-500/20 dark:bg-emerald-500/8"
        >
          <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.5} />
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
            {doneToday.length} reminder{doneToday.length !== 1 ? 's' : ''} completed today
          </p>
        </motion.div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <Section icon={AlertTriangle} label="Overdue" count={overdue.length} variant="overdue">
          {overdue.map((r) => <ReminderCard key={r.id} {...cardProps(r)} />)}
        </Section>
      )}

      {/* Due today */}
      {dueToday.length > 0 && (
        <Section icon={Clock4} label="Today" count={dueToday.length} variant="today">
          {dueToday.map((r) => <ReminderCard key={r.id} {...cardProps(r)} />)}
        </Section>
      )}

      {/* Inbox */}
      {inbox.length > 0 && (
        <Section icon={Inbox} label="Inbox" count={inbox.length} variant="inbox">
          {inbox.map((r) => <ReminderCard key={r.id} {...cardProps(r)} />)}
        </Section>
      )}

      {/* Truly empty — hero handles the messaging, just show icon below */}
      {isEmpty && !allDone && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm backdrop-blur-sm dark:bg-white/8">
            <Sparkles className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Use the input above to add your first reminder
          </p>
        </div>
      )}
    </div>
  )
}
