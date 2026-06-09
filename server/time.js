// Pure timezone / scheduler arithmetic. No state, no I/O — easy to unit-test and
// shared by the store (snooze / not_now) and the scheduler.
//
// `tzOffset` is the client's `Date.getTimezoneOffset()`: minutes to ADD to local
// time to get UTC (so UTC+3 → -180). When it's absent we fall back to the
// server's own clock, which keeps the original behaviour for local single-machine
// use while making remote-hosted servers correct.

const DAY_MS = 86400000

// Reconstruct a Date whose UTC fields equal the user's wall clock at `absMs`.
function userWall(absMs, tzOffset) {
  return new Date(absMs - tzOffset * 60000)
}

// Convert a user-wall-clock Date (UTC fields = local time) back to a real instant.
function toAbsolute(wall, tzOffset) {
  return wall.getTime() + tzOffset * 60000
}

// End-of-day (23:59:59.999) in the user's timezone, as an absolute ms instant.
export function endOfUserDay(nowMs, tzOffset) {
  if (!Number.isInteger(tzOffset)) {
    const d = new Date(nowMs)
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  }
  const wall = userWall(nowMs, tzOffset)
  wall.setUTCHours(23, 59, 59, 999)
  return toAbsolute(wall, tzOffset)
}

// The next absolute instant strictly after `fromMs` at which the user's wall clock
// reads `hour:00`. Used to land a snooze on a learned completion hour.
export function nextInstantAtLocalHour(fromMs, hour, tzOffset) {
  if (!Number.isInteger(tzOffset)) {
    const d = new Date(fromMs)
    d.setHours(hour, 0, 0, 0)
    if (d.getTime() <= fromMs) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  const wall = userWall(fromMs, tzOffset)
  wall.setUTCHours(hour, 0, 0, 0)
  let abs = toAbsolute(wall, tzOffset)
  if (abs <= fromMs) abs += DAY_MS
  return abs
}

// Where the scheduler should resume its "fired during (lastTick, now]" window on
// boot. A recent saved tick is honoured so reminders that came due during a brief
// restart still fire; a stale/missing/future value is clamped so a long outage (or
// first run) can't unleash a flood of retroactive notifications.
export function resolveStartTick(savedMs, nowMs, maxCatchupMs) {
  const saved = Number(savedMs)
  if (!Number.isFinite(saved) || saved <= 0 || saved > nowMs) return nowMs
  return Math.max(saved, nowMs - maxCatchupMs)
}
