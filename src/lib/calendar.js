import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from 'date-fns'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Build a 6×7 (or 5×7) matrix of Date objects covering the visible month grid,
// padded to whole weeks. weekStartsOn: 0 = Sunday (Apple Calendar default).
export function monthMatrix(monthDate) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  return weeks
}

export const dayKey = (date) => format(date, 'yyyy-MM-dd')

// Group reminders by calendar day (yyyy-MM-dd), each day's list sorted by time.
export function bucketByDay(reminders) {
  const map = new Map()
  for (const r of reminders) {
    if (!r.datetime) continue
    const d = new Date(r.datetime)
    if (Number.isNaN(d.getTime())) continue
    const key = format(d, 'yyyy-MM-dd')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  for (const arr of map.values()) arr.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  return map
}
