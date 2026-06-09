// Adaptive-rescheduling pattern engine. Pure arithmetic, no ML, no external
// calls. Robustness fixes over the naive spec: gate on >=3 real `done` events,
// use the MEDIAN hour (resists bimodal habits), and bail when the data is too
// scattered to give honest advice.
//
// Learning is PERSONAL-FIRST: a reminder learns from its own completion history
// when it has enough, and only falls back to the priority cohort when it doesn't.
// Every suggestion carries its `source` ('self' | 'cohort') and sample size `n`
// so the UI can explain *why* — and uses the user's local hour-of-day, captured
// client-side, so the learned time is honest across timezones.

import { nextInstantAtLocalHour } from './time.js'

const MIN_DONE_EVENTS = 3
const MAX_IQR_HOURS = 6 // if completion hours spread wider than this, don't suggest

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function sortedNumbers(values) {
  return [...values].sort((a, b) => a - b)
}

export function median(values) {
  if (!values.length) return null
  const s = sortedNumbers(values)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// Interquartile range — a robust measure of spread.
function iqr(values) {
  if (values.length < 2) return 0
  const s = sortedNumbers(values)
  const q = (p) => {
    const idx = (s.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    return s[lo] + (s[hi] - s[lo]) * (idx - lo)
  }
  return q(0.75) - q(0.25)
}

// 14 -> "2:00 PM"
export function hourLabel(hour) {
  const h = ((hour % 24) + 24) % 24
  const period = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${period}`
}

// The `done`-event hours from a flat list of events.
function doneHours(events) {
  return (events || []).filter((e) => e.action === 'done' && Number.isInteger(e.hour_of_day)).map((e) => e.hour_of_day)
}

// Collapse a list of completion hours into a robust suggested hour, or null when
// there's too little data or it's too scattered to be honest.
function hourFromEvents(events) {
  const hours = doneHours(events)
  if (hours.length < MIN_DONE_EVENTS) return null
  if (iqr(hours) > MAX_IQR_HOURS) return null
  const hour = Math.round(median(hours))
  return { hour, label: hourLabel(hour), n: hours.length }
}

// Detect a weekday tendency in a scope's completions: a dominant single day, or
// a weekend/weekday skew. Returns a short label, or null when there's no signal.
function weekdayHint(events) {
  const days = (events || []).filter((e) => e.action === 'done' && Number.isInteger(e.day_of_week)).map((e) => e.day_of_week)
  if (days.length < MIN_DONE_EVENTS) return null

  const counts = {}
  for (const d of days) counts[d] = (counts[d] || 0) + 1
  const [topDay, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  const weekend = days.filter((d) => d === 0 || d === 6).length

  if (topCount / days.length >= 0.5) return { day: Number(topDay), label: `usually on ${DAY_NAMES[topDay]}s` }
  if (weekend / days.length >= 0.7) return { label: 'usually on weekends' }
  if ((days.length - weekend) / days.length >= 0.85) return { label: 'usually on weekdays' }
  return null
}

// All events belonging to the priority cohort `target` sits in.
function cohortEvents(reminders, target) {
  const out = []
  for (const r of reminders) {
    if (r.priority !== target.priority) continue
    out.push(...(r.dismissalEvents || []))
  }
  return out
}

// Suggest a completion hour for `target`. Tries the reminder's OWN history first
// (source 'self'), then falls back to its priority cohort (source 'cohort').
// Returns { suggestion: {hour,label,source,n,weekday} | null }.
export function suggestTime(reminders, target) {
  if (!target) return { suggestion: null }

  const selfEvents = target.dismissalEvents || []
  let base = hourFromEvents(selfEvents)
  let source = 'self'
  let scope = selfEvents

  if (!base) {
    const cohort = cohortEvents(reminders, target)
    base = hourFromEvents(cohort)
    source = 'cohort'
    scope = cohort
  }

  if (!base) return { suggestion: null }
  return { suggestion: { ...base, source, weekday: weekdayHint(scope) } }
}

// Pick the next concrete time to snooze `target` to, learned from history rather
// than a fixed +1h. Schedules the next occurrence of the learned completion hour
// in the USER's timezone (`tzOffset` from Date.getTimezoneOffset()); returns null
// when there's no confident signal so callers can fall back.
export function suggestSnooze(reminders, target, from = new Date(), tzOffset = null) {
  const { suggestion } = suggestTime(reminders, target)
  if (!suggestion) return null
  const fromMs = from instanceof Date ? from.getTime() : new Date(from).getTime()
  const next = nextInstantAtLocalHour(fromMs, suggestion.hour, tzOffset)
  return { datetime: new Date(next).toISOString(), label: suggestion.label, source: suggestion.source }
}

// Per-reminder learned signals for the Patterns view. Keyed by reminder id;
// only reminders with a confident suggestion appear.
export function analyze(reminders) {
  const map = {}
  for (const r of reminders || []) {
    const { suggestion } = suggestTime(reminders, r)
    if (suggestion) map[r.id] = suggestion
  }
  return map
}
