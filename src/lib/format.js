import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isThisYear,
  differenceInCalendarDays,
} from 'date-fns'

// Produce a friendly, human-readable due label + a tone for styling.
export function formatDue(datetime) {
  if (!datetime) return { label: 'No date', tone: 'muted', overdue: false }
  const d = new Date(datetime)
  if (Number.isNaN(d.getTime())) return { label: 'No date', tone: 'muted', overdue: false }

  const time = format(d, 'h:mm a')
  const overdue = isPast(d) && !isToday(d)
  let label

  if (isToday(d)) label = `Today, ${time}`
  else if (isTomorrow(d)) label = `Tomorrow, ${time}`
  else if (isYesterday(d)) label = `Yesterday, ${time}`
  else {
    const diff = differenceInCalendarDays(d, new Date())
    if (diff > 1 && diff <= 6) label = `${format(d, 'EEEE')}, ${time}`
    else label = `${format(d, isThisYear(d) ? 'MMM d' : 'MMM d, yyyy')}, ${time}`
  }

  return { label, tone: overdue ? 'overdue' : isToday(d) ? 'today' : 'normal', overdue }
}

// Priority visual tokens — Apple palette: high=orange, medium=amber, low=blue.
// (Red is reserved for the app accent / "today" so it doesn't clash.)
export const PRIORITY = {
  high: {
    label: 'High',
    dot: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-700 ring-orange-600/10 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
    strip: 'bg-orange-500',
    order: 0,
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
    strip: 'bg-amber-400',
    order: 1,
  },
  low: {
    label: 'Low',
    dot: 'bg-blue-500',
    chip: 'bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20',
    strip: 'bg-blue-400',
    order: 2,
  },
}

export const CATEGORIES = {
  work:     { label: 'Work',     strip: 'bg-blue-500',    dot: 'bg-blue-500',    chip: 'bg-blue-50 text-blue-700 ring-blue-600/10 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20' },
  personal: { label: 'Personal', strip: 'bg-violet-500',  dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-700 ring-violet-600/10 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20' },
  health:   { label: 'Health',   strip: 'bg-emerald-500', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20' },
  finance:  { label: 'Finance',  strip: 'bg-amber-500',   dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20' },
  other:    { label: 'Other',    strip: 'bg-zinc-400',    dot: 'bg-zinc-400',    chip: 'bg-zinc-100 text-zinc-600 ring-zinc-600/10 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/10' },
}

export const RECURRENCE_LABEL = {
  none: null,
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
}

// Convert an ISO string into the value a <input type="datetime-local"> expects.
export function toLocalInput(datetime) {
  if (!datetime) return ''
  const d = new Date(datetime)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert a datetime-local value back into an ISO string (or null).
export function fromLocalInput(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
