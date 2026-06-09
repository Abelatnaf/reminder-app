import { useState, useEffect, useRef } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek,
  addMonths, subMonths,
  format, isSameDay, isSameMonth, isToday,
  getHours, getMinutes, setHours, setMinutes, getYear, setYear,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/cn.js'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)) }

// ── Year grid ──────────────────────────────────────────────────────────────────
function YearGrid({ viewMonth, onSelectYear }) {
  const current = getYear(viewMonth)
  const years = Array.from({ length: 24 }, (_, i) => current - 6 + i)
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.querySelector('[data-cur="true"]')?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])
  return (
    <div ref={ref} className="max-h-52 overflow-y-auto">
      <div className="grid grid-cols-4 gap-1 p-2">
        {years.map((y) => (
          <button key={y} type="button" data-cur={y === current}
            onClick={() => onSelectYear(y)}
            style={y === current ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
            className={cn(
              'rounded-full py-2 text-sm font-medium transition-all',
              y === current
                ? 'glass-sheen text-white shadow-sm shadow-brand-600/30'
                : 'text-zinc-700 hover:bg-white/40 dark:text-zinc-200 dark:hover:bg-white/10'
            )}>
            {y}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Calendar grid ──────────────────────────────────────────────────────────────
function CalendarGrid({ selected, viewMonth, onDaySelect, onMonthChange }) {
  const [showYears, setShowYears] = useState(false)
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(viewMonth),   { weekStartsOn: 0 }),
  })

  return (
    <div className="px-3 pb-2 pt-3">
      {/* Month / year nav */}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(subMonths(viewMonth, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setShowYears((v) => !v)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
          {format(viewMonth, 'MMMM yyyy')}
          <ChevronDown className={cn('h-3.5 w-3.5 text-zinc-400 transition-transform duration-200', showYears && 'rotate-180')} />
        </button>
        <button type="button" onClick={() => onMonthChange(addMonths(viewMonth, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showYears ? (
          <motion.div key="years" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            <YearGrid
              viewMonth={viewMonth}
              onSelectYear={(y) => { onMonthChange(setYear(viewMonth, y)); setShowYears(false) }}
            />
          </motion.div>
        ) : (
          <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {/* DoW headers */}
            <div className="mb-1 grid grid-cols-7">
              {DOW.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-zinc-400">{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((day) => {
                const sel      = selected && isSameDay(day, selected)
                const inMonth  = isSameMonth(day, viewMonth)
                const todayDay = isToday(day)
                return (
                  <button key={day.toISOString()} type="button" onClick={() => onDaySelect(day)}
                    style={sel ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
                    className={cn(
                      'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all',
                      sel      && 'glass-sheen font-semibold text-white shadow-sm shadow-brand-600/30',
                      !sel && todayDay && 'font-semibold text-brand-600 ring-2 ring-brand-500 dark:text-brand-400',
                      !sel && !todayDay && inMonth  && 'text-zinc-800 hover:bg-white/50 dark:text-zinc-100 dark:hover:bg-white/10',
                      !sel && !todayDay && !inMonth && 'text-zinc-300 dark:text-zinc-600',
                    )}>
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Time picker ────────────────────────────────────────────────────────────────
function TimePicker({ value, onChange }) {
  const d    = value ? new Date(value) : new Date()
  const rawH = getHours(d)
  const mins = getMinutes(d)
  const isPM = rawH >= 12
  const h12  = rawH === 0 ? 12 : rawH > 12 ? rawH - 12 : rawH

  function commit(h24, m) {
    const base = value ? new Date(value) : new Date()
    const next = setMinutes(setHours(new Date(base), clamp(h24, 0, 23)), clamp(m, 0, 59))
    next.setSeconds(0, 0)
    onChange(next.toISOString())
  }

  function setH(h, pm) { commit((h % 12) + (pm ? 12 : 0), mins) }
  function incH()  { setH(h12 >= 12 ? 1 : h12 + 1, isPM) }
  function decH()  { setH(h12 <= 1 ? 12 : h12 - 1, isPM) }
  function incM()  { commit(rawH, mins >= 59 ? 0 : mins + 1) }
  function decM()  { commit(rawH, mins <= 0 ? 59 : mins - 1) }

  const TileBtn = ({ children, onClick, ...rest }) => (
    <button type="button" onClick={onClick} {...rest}
      className="p-1 text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200">
      {children}
    </button>
  )

  return (
    <div className="border-t border-zinc-200/80 px-3 py-3 dark:border-white/10">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Select time</p>
      <div className="flex items-center gap-3">
        {/* Hour */}
        <div className="flex flex-1 flex-col items-center gap-0.5">
          <TileBtn onClick={incH}><ChevronUp className="h-4 w-4" /></TileBtn>
          <div className="glass-pill w-full rounded-xl px-3 py-3 text-center">
            <span className="text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-300">
              {String(h12).padStart(2, '0')}
            </span>
          </div>
          <TileBtn onClick={decH}><ChevronDown className="h-4 w-4" /></TileBtn>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Hour</span>
        </div>

        <span className="mb-6 text-2xl font-bold text-zinc-300 dark:text-zinc-600">:</span>

        {/* Minute */}
        <div className="flex flex-1 flex-col items-center gap-0.5">
          <TileBtn onClick={incM}><ChevronUp className="h-4 w-4" /></TileBtn>
          <div className="glass-pill w-full rounded-xl px-3 py-3 text-center">
            <span className="text-3xl font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
              {String(mins).padStart(2, '0')}
            </span>
          </div>
          <TileBtn onClick={decM}><ChevronDown className="h-4 w-4" /></TileBtn>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Min</span>
        </div>

        {/* AM / PM */}
        <div className="mb-6 flex flex-col gap-2">
          <button type="button" onClick={() => { if (isPM) setH(h12, false) }}
            style={!isPM ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-bold transition-all',
              !isPM ? 'glass-sheen text-white shadow-sm shadow-brand-600/30' : 'glass-pill text-zinc-500 dark:text-zinc-400'
            )}>
            AM
          </button>
          <button type="button" onClick={() => { if (!isPM) setH(h12, true) }}
            style={isPM ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-bold transition-all',
              isPM ? 'glass-sheen text-white shadow-sm shadow-brand-600/30' : 'glass-pill text-zinc-500 dark:text-zinc-400'
            )}>
            PM
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Public component ───────────────────────────────────────────────────────────
export function DateTimePicker({ value, onChange }) {
  const selectedDate = value ? new Date(value) : null
  const [viewMonth, setViewMonth] = useState(selectedDate || new Date())

  function handleDaySelect(day) {
    const base = value ? new Date(value) : null
    const next = new Date(day)
    if (base) {
      next.setHours(base.getHours(), base.getMinutes(), 0, 0)
    } else {
      next.setHours(9, 0, 0, 0)
    }
    onChange(next.toISOString())
    setViewMonth(next)
  }

  return (
    <div className="surface-modal overflow-hidden rounded-2xl">
      {/* Material-style brand header */}
      <div
        className="glass-sheen px-5 py-4 text-white"
        style={{ background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-75">
          {selectedDate ? 'Selected date' : 'Select date'}
        </p>
        <p className="mt-1 text-[1.6rem] font-bold leading-tight tracking-tight">
          {selectedDate ? format(selectedDate, 'EEE, MMM d') : 'No date set'}
        </p>
        {selectedDate && (
          <p className="mt-0.5 text-sm font-medium opacity-80">
            {format(selectedDate, 'h:mm a')}
          </p>
        )}
      </div>

      <CalendarGrid
        selected={selectedDate}
        viewMonth={viewMonth}
        onDaySelect={handleDaySelect}
        onMonthChange={setViewMonth}
      />

      <TimePicker value={value} onChange={onChange} />
    </div>
  )
}
