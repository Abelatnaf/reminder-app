import { useMemo, useState, useRef, useEffect } from 'react'
import { format, isToday, addDays, subDays, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Inbox } from 'lucide-react'
import { ReminderCard } from './ReminderCard.jsx'
import { CATEGORIES, PRIORITY } from '../lib/format.js'
import { cn } from '../lib/cn.js'

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5) // 5am – 11pm

function hourLabel(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

export function CalendarDay({ reminders, onQuickAdd, cardProps }) {
  const [day, setDay] = useState(() => new Date())
  const nowRef = useRef(null)

  // Scroll to current time on first render
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [])

  const { byHour, allDay } = useMemo(() => {
    const byHour = new Map()
    const allDay = []
    for (const r of reminders) {
      if (r.done) continue
      if (!r.datetime) { allDay.push(r); continue }
      if (!isSameDay(new Date(r.datetime), day)) continue
      const h = new Date(r.datetime).getHours()
      if (!byHour.has(h)) byHour.set(h, [])
      byHour.get(h).push(r)
    }
    return { byHour, allDay }
  }, [reminders, day])

  const currentHour = new Date().getHours()
  const isCurrentDay = isToday(day)

  const goToday = () => setDay(new Date())

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {format(day, 'EEEE')}{' '}
          <span className="font-normal text-zinc-400 dark:text-zinc-500">{format(day, 'MMMM d')}</span>
          {isCurrentDay && <span className="ml-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-sm font-medium text-brand-600 dark:text-brand-400">Today</span>}
        </h2>
        <div className="flex items-center gap-1">
          {!isCurrentDay && (
            <button onClick={goToday} className="mr-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-500/10 ring-focus dark:text-brand-400">
              Today
            </button>
          )}
          <button onClick={() => setDay((d) => subDays(d, 1))} aria-label="Previous day" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setDay((d) => addDays(d, 1))} aria-label="Next day" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* All-day tray */}
      {allDay.length > 0 && (
        <div className="surface rounded-2xl px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">No time set</p>
          <div className="space-y-2">
            {allDay.map((r) => <ReminderCard key={r.id} {...cardProps(r)} />)}
          </div>
        </div>
      )}

      {/* Hour grid */}
      <div className="surface overflow-hidden rounded-2xl">
        {HOURS.map((h) => {
          const items = byHour.get(h) || []
          const isNow = isCurrentDay && h === currentHour
          return (
            <div
              key={h}
              ref={isNow ? nowRef : null}
              className={cn(
                'flex gap-3 border-b hairline last:border-b-0',
                isNow && 'bg-brand-500/[0.04] dark:bg-brand-500/[0.06]'
              )}
            >
              {/* Time label */}
              <div className="w-16 shrink-0 py-3 pl-4 text-right text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                {hourLabel(h)}
                {isNow && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle" />}
              </div>

              {/* Slot content */}
              <div className="min-h-[52px] flex-1 py-2 pr-3">
                {items.length > 0 ? (
                  <div className="space-y-1.5">
                    {items.map((r) => {
                      const cat = CATEGORIES[r.category]
                      const p   = PRIORITY[r.priority] || PRIORITY.medium
                      const mins = new Date(r.datetime).getMinutes()
                      return (
                        <button
                          key={r.id}
                          onClick={() => cardProps(r).onEdit()}
                          className="glass-pill flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all"
                        >
                          {/* Category / priority color strip */}
                          <span className={cn('h-3 w-1 shrink-0 rounded-full', cat ? cat.strip : p.strip)} />
                          <span className="flex-1 truncate font-medium text-zinc-800 dark:text-zinc-100">{r.title}</span>
                          {mins > 0 && <span className="shrink-0 text-xs text-zinc-400">:{String(mins).padStart(2, '0')}</span>}
                          {r.location && <span className="hidden truncate text-xs text-zinc-400 sm:block">📍 {r.location}</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const d = new Date(day)
                      d.setHours(h, 0, 0, 0)
                      onQuickAdd(d)
                    }}
                    className="group flex h-full w-full items-center gap-1 text-xs text-transparent transition-colors hover:text-zinc-400"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Unscheduled inbox for this day context */}
      {byHour.size === 0 && allDay.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-zinc-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Nothing scheduled for this day.</p>
          <button
            onClick={() => onQuickAdd(day)}
            style={{ background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' }}
            className="glass-sheen mt-1 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-brand-600/30"
          >
            <Plus className="h-4 w-4" /> Add reminder
          </button>
        </div>
      )}
    </div>
  )
}
