import { useMemo, useState } from 'react'
import { format, isToday, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Inbox } from 'lucide-react'
import { monthMatrix, bucketByDay, dayKey, WEEKDAYS } from '../lib/calendar.js'
import { PRIORITY } from '../lib/format.js'
import { ReminderCard } from './ReminderCard.jsx'
import { cn } from '../lib/cn.js'

const MAX_CHIPS = 3

// Apple Calendar–style month grid with a day-detail panel below.
// `cardProps(r)` returns the full prop set for a ReminderCard (wired in App).
export function CalendarMonth({ reminders, onQuickAdd, cardProps }) {
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())

  const weeks = useMemo(() => monthMatrix(month), [month])
  const byDay = useMemo(() => bucketByDay(reminders), [reminders])
  const unscheduled = useMemo(() => reminders.filter((r) => !r.datetime), [reminders])
  const selectedItems = byDay.get(dayKey(selected)) || []

  const goToday = () => {
    const now = new Date()
    setMonth(now)
    setSelected(now)
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {format(month, 'MMMM')} <span className="font-normal text-zinc-400 dark:text-zinc-500">{format(month, 'yyyy')}</span>
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="mr-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-500/10 ring-focus dark:text-brand-400">
            Today
          </button>
          <button onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 ring-focus dark:hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 ring-focus dark:hover:bg-white/10">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="surface overflow-hidden rounded-2xl">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b hairline">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, i) => {
            const items = byDay.get(dayKey(day)) || []
            const inMonth = isSameMonth(day, month)
            const today = isToday(day)
            const isSelected = isSameDay(day, selected)
            return (
              <button
                key={i}
                onClick={() => setSelected(day)}
                className={cn(
                  'min-h-[84px] border-b border-r hairline p-1.5 text-left align-top transition-colors last:border-r-0 sm:min-h-[104px]',
                  (i + 1) % 7 === 0 && 'border-r-0',
                  !inMonth && 'bg-zinc-50/60 dark:bg-white/[0.02]',
                  isSelected && 'bg-brand-500/[0.06] dark:bg-brand-500/10',
                  'hover:bg-zinc-50 dark:hover:bg-white/[0.04]'
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold tabular-nums',
                      today ? 'bg-brand-600 text-white' : inMonth ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-300 dark:text-zinc-600'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {items.length > 0 && (
                    <span className="hidden text-[10px] font-medium text-zinc-400 sm:inline">{items.length}</span>
                  )}
                </div>

                {/* Event chips (desktop) */}
                <div className="hidden space-y-0.5 sm:block">
                  {items.slice(0, MAX_CHIPS).map((r) => {
                    const p = PRIORITY[r.priority] || PRIORITY.medium
                    return (
                      <span
                        key={r.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          cardProps(r).onEdit()
                        }}
                        className={cn('flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] leading-tight transition-colors hover:bg-zinc-100 dark:hover:bg-white/10', r.done && 'opacity-50 line-through')}
                      >
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', p.dot)} />
                        <span className="truncate text-zinc-700 dark:text-zinc-200">{r.title}</span>
                      </span>
                    )
                  })}
                  {items.length > MAX_CHIPS && (
                    <span className="block px-1 text-[10px] font-medium text-zinc-400">+{items.length - MAX_CHIPS} more</span>
                  )}
                </div>

                {/* Event dots (mobile) */}
                {items.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((r) => {
                      const p = PRIORITY[r.priority] || PRIORITY.medium
                      return <span key={r.id} className={cn('h-1.5 w-1.5 rounded-full', p.dot, r.done && 'opacity-40')} />
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            {format(selected, 'EEEE, MMMM d')}
            {isToday(selected) && <span className="ml-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">Today</span>}
          </h3>
          <button
            onClick={() => onQuickAdd(selected)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-500/10 ring-focus dark:text-brand-400"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {selectedItems.length > 0 ? (
          <div className="space-y-2">
            {selectedItems.map((r) => (
              <ReminderCard key={r.id} {...cardProps(r)} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed hairline px-4 py-8 text-center text-sm text-zinc-400">Nothing scheduled this day.</p>
        )}

        {/* Unscheduled tray */}
        {unscheduled.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              <Inbox className="h-4 w-4" /> Unscheduled
            </h3>
            <div className="space-y-2">
              {unscheduled.map((r) => (
                <ReminderCard key={r.id} {...cardProps(r)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
