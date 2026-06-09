import { test } from 'node:test'
import assert from 'node:assert/strict'
import { endOfUserDay, nextInstantAtLocalHour, resolveStartTick } from './time.js'

const NOW = Date.UTC(2026, 5, 8, 12, 0, 0) // 2026-06-08 12:00 UTC
const UTC_PLUS_3 = -180 // Date.getTimezoneOffset() for UTC+3
const HOUR = 3600000

// Read back the user's wall-clock hour from an absolute instant + offset.
const wallHour = (absMs, tz) => new Date(absMs - tz * 60000).getUTCHours()

test('endOfUserDay lands on 23:59 in the user’s timezone', () => {
  const eod = endOfUserDay(NOW, UTC_PLUS_3)
  assert.equal(wallHour(eod, UTC_PLUS_3), 23)
  assert.ok(eod > NOW) // later today, not yesterday
})

test('endOfUserDay falls back to server-local when offset is missing', () => {
  const eod = endOfUserDay(NOW, null)
  assert.equal(new Date(eod).getHours(), 23) // server-local end of day
})

test('nextInstantAtLocalHour rolls forward to the user’s next HH:00', () => {
  // 12:00 UTC == 15:00 for UTC+3, so 2pm has passed → tomorrow 2pm.
  const next = nextInstantAtLocalHour(NOW, 14, UTC_PLUS_3)
  assert.equal(wallHour(next, UTC_PLUS_3), 14)
  assert.ok(next > NOW)
  assert.ok(next - NOW <= 24 * HOUR)
})

test('nextInstantAtLocalHour stays today when the hour is still ahead', () => {
  const next = nextInstantAtLocalHour(NOW, 18, UTC_PLUS_3) // 18:00 > 15:00 user-local
  assert.equal(wallHour(next, UTC_PLUS_3), 18)
  assert.ok(next - NOW < 6 * HOUR)
})

test('resolveStartTick honours a recent saved tick (covers brief restarts)', () => {
  const saved = NOW - 2 * 60000 // 2 minutes ago
  assert.equal(resolveStartTick(saved, NOW, 6 * HOUR), saved)
})

test('resolveStartTick caps a stale tick to the catch-up window', () => {
  const saved = NOW - 10 * HOUR
  assert.equal(resolveStartTick(saved, NOW, 6 * HOUR), NOW - 6 * HOUR)
})

test('resolveStartTick ignores missing, zero, or future ticks (no retroactive flood)', () => {
  assert.equal(resolveStartTick(undefined, NOW, 6 * HOUR), NOW)
  assert.equal(resolveStartTick(0, NOW, 6 * HOUR), NOW)
  assert.equal(resolveStartTick(NaN, NOW, 6 * HOUR), NOW)
  assert.equal(resolveStartTick(NOW + HOUR, NOW, 6 * HOUR), NOW) // clock skew
})
