import { test } from 'node:test'
import assert from 'node:assert/strict'
import { median, hourLabel, suggestTime, suggestSnooze, analyze } from './engine.js'

// Build a `done` event at a given local hour/day.
const done = (hour, day = 1) => ({ action: 'done', hour_of_day: hour, day_of_day: day, day_of_week: day, timestamp: '2026-06-01T00:00:00.000Z' })
const reminder = (id, priority, events = []) => ({ id, priority, dismissalEvents: events })

test('median handles odd and even counts', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([1, 2, 3, 4]), 2.5)
  assert.equal(median([]), null)
})

test('hourLabel formats 12-hour clock', () => {
  assert.equal(hourLabel(0), '12:00 AM')
  assert.equal(hourLabel(12), '12:00 PM')
  assert.equal(hourLabel(14), '2:00 PM')
  assert.equal(hourLabel(9), '9:00 AM')
})

test('suggestTime returns null for a missing target', () => {
  assert.deepEqual(suggestTime([], null), { suggestion: null })
})

test('suggestTime learns from the reminder’s OWN history first (source: self)', () => {
  const target = reminder('a', 'high', [done(14), done(14), done(15)])
  const { suggestion } = suggestTime([target], target)
  assert.equal(suggestion.source, 'self')
  assert.equal(suggestion.hour, 14)
  assert.equal(suggestion.n, 3)
  assert.equal(suggestion.label, '2:00 PM')
})

test('suggestTime falls back to the priority cohort when self is too thin', () => {
  const target = reminder('a', 'high', []) // no own events
  const peer1 = reminder('b', 'high', [done(9), done(10)])
  const peer2 = reminder('c', 'high', [done(9)])
  const { suggestion } = suggestTime([target, peer1, peer2], target)
  assert.equal(suggestion.source, 'cohort')
  assert.equal(suggestion.hour, 9)
  assert.equal(suggestion.n, 3)
})

test('suggestTime bails out when completion hours are too scattered', () => {
  const target = reminder('a', 'low', [done(2), done(14), done(22)])
  assert.equal(suggestTime([target], target).suggestion, null)
})

test('suggestTime needs at least 3 completions', () => {
  const target = reminder('a', 'low', [done(14), done(14)])
  assert.equal(suggestTime([target], target).suggestion, null)
})

test('suggestTime surfaces a dominant weekday', () => {
  const sat = (h) => done(h, 6)
  const target = reminder('a', 'medium', [sat(10), sat(10), sat(11), sat(10)])
  const { suggestion } = suggestTime([target], target)
  assert.ok(suggestion.weekday)
  assert.match(suggestion.weekday.label, /Saturday/)
})

test('suggestSnooze schedules the learned hour and is null without a signal', () => {
  const target = reminder('a', 'high', [done(14), done(14), done(15)])
  const from = new Date('2026-06-08T08:00:00') // local
  const snooze = suggestSnooze([target], target, from)
  assert.equal(new Date(snooze.datetime).getHours(), 14)
  assert.equal(snooze.source, 'self')

  const cold = reminder('b', 'low', [])
  assert.equal(suggestSnooze([cold], cold, from), null)
})

test('suggestSnooze honours the user’s timezone offset', () => {
  const target = reminder('a', 'high', [done(14), done(14), done(15)])
  const from = new Date(Date.UTC(2026, 5, 8, 6, 0, 0)) // 06:00 UTC
  const tz = -180 // UTC+3 → 09:00 user-local, so 2pm is still ahead today
  const snooze = suggestSnooze([target], target, from, tz)
  const userHour = new Date(new Date(snooze.datetime).getTime() - tz * 60000).getUTCHours()
  assert.equal(userHour, 14) // lands on 2pm in the USER's tz regardless of server tz
})

test('analyze maps only reminders with a confident suggestion', () => {
  const learned = reminder('a', 'high', [done(14), done(14), done(15)])
  const thin = reminder('b', 'low', [done(9)])
  const map = analyze([learned, thin])
  assert.ok(map.a)
  assert.equal(map.b, undefined)
})
