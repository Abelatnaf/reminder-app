import { addDays, addWeeks, addMonths } from 'date-fns'

export const RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', 'custom']

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

// Compute the next occurrence strictly after `from` for a recurring reminder.
// Returns an ISO string, or null if the reminder doesn't recur or has no datetime.
export function nextOccurrence(reminder, from = new Date()) {
  const { recurrence, datetime } = reminder
  if (!recurrence || recurrence === 'none' || !datetime) return null

  let current = new Date(datetime)
  if (Number.isNaN(current.getTime())) return null

  const fromMs = from instanceof Date ? from.getTime() : new Date(from).getTime()
  const step = advancer(reminder)

  // Roll forward until we pass `from`. This handles reminders completed late or
  // periods that were missed. The guard makes a malformed rule impossible to hang.
  let guard = 0
  do {
    current = step(current)
    guard += 1
  } while (current.getTime() <= fromMs && guard < 750)

  return current.toISOString()
}

// Choose the function that advances a date by one period for this reminder.
function advancer(reminder) {
  switch (reminder.recurrence) {
    case 'daily':
      return (d) => addDays(d, 1)
    case 'weekly':
      return (d) => addWeeks(d, 1)
    case 'monthly':
      return (d) => addMonths(d, 1)
    case 'custom':
      return customAdvancer(reminder.recurrenceDetail)
    default:
      return (d) => addDays(d, 1)
  }
}

// Parse a lightweight custom hint such as "WEEKLY:TU,TH", "INTERVAL:2;UNIT:week",
// or "MONTHLY:FIRST;WEEKDAY:MO". Falls back to weekly if the hint can't be understood.
function customAdvancer(detail = '') {
  const text = String(detail || '').toUpperCase()

  // Nth-weekday-of-month form: MONTHLY:FIRST;WEEKDAY:MO
  const nthMatch = text.match(/MONTHLY:(FIRST|SECOND|THIRD|FOURTH|LAST);WEEKDAY:([A-Z]{2})/)
  if (nthMatch) {
    const NTH_MAP = { FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4, LAST: -1 }
    const nth = NTH_MAP[nthMatch[1]] ?? 1
    const wdayIdx = WEEKDAYS.indexOf(nthMatch[2])
    if (wdayIdx >= 0) {
      return (d) => {
        // Advance to the same nth-weekday in the NEXT month
        const next = addMonths(d, 1)
        return nthWeekdayOfMonth(next.getFullYear(), next.getMonth(), wdayIdx, nth)
      }
    }
  }

  // Weekday-list form: advance to the next listed weekday.
  const weekdayMatch = text.match(/(?:WEEKLY:|DAYS:)([A-Z,]+)/)
  if (weekdayMatch) {
    const days = weekdayMatch[1]
      .split(',')
      .map((d) => WEEKDAYS.indexOf(d.trim().slice(0, 2)))
      .filter((i) => i >= 0)
    if (days.length) {
      return (d) => {
        let next = addDays(d, 1)
        let guard = 0
        while (!days.includes(next.getDay()) && guard < 14) {
          next = addDays(next, 1)
          guard += 1
        }
        return next
      }
    }
  }

  // Interval form: INTERVAL:3;UNIT:day|week|month
  const interval = Number((text.match(/INTERVAL:(\d+)/) || [])[1]) || 1
  const unit = (text.match(/UNIT:(DAY|WEEK|MONTH)/) || [])[1] || 'WEEK'
  if (unit === 'DAY') return (d) => addDays(d, interval)
  if (unit === 'MONTH') return (d) => addMonths(d, interval)
  return (d) => addWeeks(d, interval)
}

// Return a Date for the nth occurrence (1-based, or -1 for last) of weekday in a given month.
function nthWeekdayOfMonth(year, month, weekday, nth) {
  if (nth === -1) {
    // Last: start from end of month, walk backwards
    const last = new Date(year, month + 1, 0) // last day of month
    while (last.getDay() !== weekday) last.setDate(last.getDate() - 1)
    return last
  }
  // 1st: find the first occurrence then skip (nth-1) weeks
  const first = new Date(year, month, 1)
  const diff = (weekday - first.getDay() + 7) % 7
  return new Date(year, month, 1 + diff + (nth - 1) * 7)
}
