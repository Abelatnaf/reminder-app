import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextOccurrence } from './recurrence.js'

const DAY = 86400000

test('non-recurring or dateless reminders have no next occurrence', () => {
  assert.equal(nextOccurrence({ recurrence: 'none', datetime: '2026-06-01T09:00:00' }), null)
  assert.equal(nextOccurrence({ recurrence: 'daily', datetime: null }), null)
  assert.equal(nextOccurrence({ recurrence: 'daily', datetime: 'not-a-date' }), null)
})

test('daily rolls to the first occurrence strictly after `from`', () => {
  const from = new Date('2026-06-05T10:00:00')
  const next = new Date(nextOccurrence({ recurrence: 'daily', datetime: '2026-06-01T09:00:00' }, from))
  assert.ok(next > from)
  assert.ok(next - from <= DAY) // it's the *next* day's occurrence, not a later one
})

test('weekly advances by one week past `from`', () => {
  const from = new Date('2026-06-05T10:00:00')
  const next = new Date(nextOccurrence({ recurrence: 'weekly', datetime: '2026-06-01T09:00:00' }, from))
  assert.ok(next > from)
  assert.ok(next - from <= 7 * DAY)
})

test('monthly advances to the next month past `from`', () => {
  const from = new Date('2026-06-05T10:00:00')
  const next = new Date(nextOccurrence({ recurrence: 'monthly', datetime: '2026-06-01T09:00:00' }, from))
  assert.ok(next > from)
  assert.ok(next - from <= 32 * DAY)
})

test('custom weekday list lands on a listed weekday', () => {
  // 2026-06-02 is a Tuesday. Rule fires on Tue/Thu.
  const from = new Date('2026-06-02T10:00:00')
  const next = new Date(nextOccurrence({ recurrence: 'custom', recurrenceDetail: 'WEEKLY:TU,TH', datetime: '2026-06-02T09:00:00' }, from))
  assert.ok(next > from)
  assert.ok([2, 4].includes(next.getDay())) // Tuesday or Thursday
})

test('custom interval form advances by N units', () => {
  const from = new Date('2026-06-05T10:00:00')
  const next = new Date(nextOccurrence({ recurrence: 'custom', recurrenceDetail: 'INTERVAL:2;UNIT:week', datetime: '2026-06-01T09:00:00' }, from))
  assert.ok(next > from)
  // Two-week step from Jun 1 clears `from` at Jun 15.
  assert.ok(next - from <= 14 * DAY)
})
