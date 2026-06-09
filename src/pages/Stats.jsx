import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChartNoAxesColumn, ArrowRight, Sparkles } from 'lucide-react'
import { api } from '../lib/api.js'
import { Spinner } from '../components/ui/Spinner.jsx'
import { cn } from '../lib/cn.js'

const pct = (n) => `${Math.round(n * 100)}%`

// Compute per-reminder stats from its logged dismissal events.
function computeRow(r) {
  const events = r.dismissalEvents || []
  const done = events.filter((e) => e.action === 'done').length
  const dismissals = events.filter((e) => e.action === 'snooze' || e.action === 'not_now').length
  const total = events.length
  const rate = total ? done / total : null

  let before = null
  let after = null
  if (r.rescheduledByEngine && r.rescheduleDate) {
    const split = new Date(r.rescheduleDate).getTime()
    const b = events.filter((e) => new Date(e.timestamp).getTime() < split)
    const a = events.filter((e) => new Date(e.timestamp).getTime() >= split)
    before = b.length ? b.filter((e) => e.action === 'done').length / b.length : null
    after = a.length ? a.filter((e) => e.action === 'done').length / a.length : null
  }
  return { id: r.id, title: r.title, done, dismissals, total, rate, rescheduled: r.rescheduledByEngine, before, after }
}

export function Stats({ onBack }) {
  const [reminders, setReminders] = useState(null)
  const [patterns, setPatterns] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.list(), api.patterns().catch(() => ({}))])
      .then(([list, learned]) => {
        setReminders(list)
        setPatterns(learned || {})
      })
      .catch((e) => setError(e.message))
  }, [])

  const rows = useMemo(
    () => (reminders || []).map((r) => ({ ...computeRow(r), learned: patterns[r.id] || null })).filter((r) => r.total > 0),
    [reminders, patterns]
  )
  const withData = rows.length > 0

  const rescheduled = rows.filter((r) => r.rescheduled && r.before != null && r.after != null)
  const improved = rescheduled.filter((r) => r.after > r.before).length

  return (
    <div className="mx-auto min-h-full w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 ring-focus dark:hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-500 text-white shadow-sm">
            <ChartNoAxesColumn className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">Patterns</h1>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">What the engine has learned about you</p>
          </div>
        </div>
      </div>

      {/* Kill-criterion explainer */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200/70 bg-brand-50/70 px-4 py-3 text-sm dark:border-brand-500/20 dark:bg-brand-500/10">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <p className="text-brand-900/90 dark:text-brand-100/90">
          <strong>The test:</strong> for reminders the engine rescheduled, the <em>after</em> completion rate should beat the <em>before</em> rate over ~14 days.{' '}
          {rescheduled.length > 0
            ? `So far ${improved}/${rescheduled.length} rescheduled reminders improved.`
            : 'No engine reschedules yet — keep using the three actions and check back.'}
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
      ) : reminders === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand-500" />
        </div>
      ) : !withData ? (
        <div className="rounded-2xl border border-dashed hairline px-6 py-16 text-center text-sm text-zinc-400">
          No activity logged yet. Use <strong>Done</strong>, <strong>Snooze</strong>, or <strong>Later</strong> on your reminders and the data will appear here.
        </div>
      ) : (
        <div className="surface overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b hairline text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-semibold">Reminder</th>
                <th className="px-3 py-3 text-left font-semibold">Best time</th>
                <th className="px-3 py-3 text-center font-semibold">Done</th>
                <th className="px-3 py-3 text-center font-semibold">Dismissed</th>
                <th className="px-3 py-3 text-center font-semibold">Engine</th>
                <th className="px-4 py-3 text-right font-semibold">Completion rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hairline last:border-b-0">
                  <td className="max-w-[14rem] truncate px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100" title={r.title}>{r.title}</td>
                  <td className="px-3 py-3">
                    {r.learned ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-zinc-700 dark:text-zinc-200">
                          {r.learned.label}
                          <span
                            className="rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400"
                            title={`Learned from ${r.learned.n} completion${r.learned.n === 1 ? '' : 's'} (${r.learned.source === 'self' ? 'this reminder' : 'same priority'})`}
                          >
                            {r.learned.source === 'self' ? 'self' : 'cohort'} · {r.learned.n}
                          </span>
                        </span>
                        {r.learned.weekday && <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{r.learned.weekday.label}</span>}
                      </div>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400">{r.done}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-zinc-500">{r.dismissals}</td>
                  <td className="px-3 py-3 text-center">
                    {r.rescheduled ? <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">✓</span> : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.rescheduled && r.before != null && r.after != null ? (
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <span className="text-zinc-400">{pct(r.before)}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-400" />
                        <span className={cn('font-semibold', r.after >= r.before ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400')}>{pct(r.after)}</span>
                      </span>
                    ) : (
                      <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{r.rate != null ? pct(r.rate) : '—'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
