import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { config, isNotionConfigured } from './config.js'
import { nextOccurrence } from './recurrence.js'
import * as engine from './engine.js'
import * as notion from './notion.js'
import * as gcal from './googlecal.js'
import { endOfUserDay } from './time.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_FILE = path.join(__dirname, 'reminders.json')
const MAX_EVENTS = 50
const ENGINE_KEYS = ['dismissalEvents', 'rescheduledByEngine', 'rescheduleDate', 'hiddenUntil']

// In-memory cache keyed by userId. The special key '__local__' is used when
// running without auth (dev/legacy mode).
const cache = new Map()
let mode = 'local'
let ready = false

export const getMode = () => mode
export const isReady = () => ready

// ── snapshot helpers ────────────────────────────────────────────────────────
async function readSnapshot() {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, 'utf8')
    const data = JSON.parse(raw)
    // Legacy format: a plain array → treat as belonging to '__local__'
    if (Array.isArray(data)) return { __local__: data }
    // New format: { [userId]: reminder[] }
    if (data && typeof data === 'object' && !data.reminders) return data
    // Old legacy object with a "reminders" key
    return { __local__: data.reminders || [] }
  } catch {
    return {}
  }
}

async function writeSnapshot() {
  const obj = {}
  for (const [uid, list] of cache) obj[uid] = list
  try {
    await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(obj, null, 2))
  } catch (err) {
    console.warn('[reminders] Could not write snapshot:', err.message)
  }
}

function getCache(userId) {
  if (!cache.has(userId)) cache.set(userId, [])
  return cache.get(userId)
}

function setCache(userId, list) {
  cache.set(userId, list)
}

// ── init ───────────────────────────────────────────────────────────────────
export async function init() {
  if (isNotionConfigured()) {
    try {
      const dbId = await notion.ensureDatabase()
      // In Notion mode we load all reminders once; per-request filtering happens in list().
      const allReminders = await notion.listFromNotion(dbId)
      // Group by userId stored in each reminder record.
      cache.clear()
      for (const r of allReminders) {
        const uid = r.userId || '__local__'
        if (!cache.has(uid)) cache.set(uid, [])
        cache.get(uid).push(r)
      }
      mode = 'notion'
      await writeSnapshot()
      ready = true
      console.log(`[reminders] Notion mode — ${allReminders.length} reminder(s) loaded.`)
      return
    } catch (err) {
      console.warn('[reminders] Notion unavailable, falling back to local JSON:', err.message)
    }
  }
  const snapshot = await readSnapshot()
  cache.clear()
  for (const [uid, list] of Object.entries(snapshot)) {
    cache.set(uid, Array.isArray(list) ? list : [])
  }
  mode = 'local'
  const total = [...cache.values()].reduce((s, l) => s + l.length, 0)
  ready = true
  console.log(`[reminders] Local mode — ${total} reminder(s) loaded from snapshot.`)
}

// ── queries ──────────────────────────────────────────────────────────────
export const list = (userId = '__local__') => getCache(userId)

export function suggestTime(id, userId = '__local__') {
  const userReminders = getCache(userId)
  const target = userReminders.find((r) => r.id === id)
  return engine.suggestTime(userReminders, target)
}

export function patterns(userId = '__local__') {
  return engine.analyze(getCache(userId))
}

// ── mutations ──────────────────────────────────────────────────────────────
export async function create(fields, userId = '__local__') {
  const clean = normalize(fields)
  let created
  if (mode === 'notion') {
    created = await notion.createInNotion(config.notionDatabaseId, clean, userId)
    setCache(userId, [{ ...created, userId }, ...getCache(userId)])
  } else {
    created = { id: randomUUID(), createdAt: new Date().toISOString(), userId, ...clean }
    setCache(userId, [created, ...getCache(userId)])
  }
  await writeSnapshot()

  // Fire-and-forget: push to Google Calendar if connected and push is enabled
  // (isPushEnabled implies connected — the flag lives on the stored token record)
  if (created.datetime && gcal.isConfigured() && await gcal.isPushEnabled(userId)) {
    gcal.pushToGoogle(userId, created)
      .then((eventId) => {
        if (!eventId) return
        const existing = getCache(userId).find((r) => r.id === created.id)
        if (existing) writePatch(existing, { gcalEventId: eventId }, userId).catch(() => {})
      })
      .catch((err) => console.warn('[gcal push create]', err.message))
  }

  return created
}

export async function update(id, fields, userId = '__local__') {
  const userReminders = getCache(userId)
  const existing = userReminders.find((r) => r.id === id)
  if (!existing) throw notFound()

  let patch = { ...fields }
  if (fields.done === true && existing.recurrence !== 'none' && existing.datetime) {
    const next = nextOccurrence(existing, new Date())
    if (next) patch = { ...fields, done: false, datetime: next }
  }
  const updated = await writePatch(existing, patch, userId)

  // Fire-and-forget: sync update to Google Calendar if connected and push is enabled
  if (updated.datetime && gcal.isConfigured() && await gcal.isPushEnabled(userId)) {
    gcal.pushToGoogle(userId, updated)
      .then((eventId) => {
        // Only write back eventId if the reminder didn't have one yet (first push)
        if (!eventId || updated.gcalEventId) return
        const current = getCache(userId).find((r) => r.id === updated.id)
        if (current) writePatch(current, { gcalEventId: eventId }, userId).catch(() => {})
      })
      .catch((err) => console.warn('[gcal push update]', err.message))
  }

  return updated
}

export async function remove(id, userId = '__local__') {
  const userReminders = getCache(userId)
  const existing = userReminders.find((r) => r.id === id)
  if (!existing) throw notFound()

  if (mode === 'notion') {
    try {
      await notion.deleteInNotion(id)
    } catch (err) {
      console.warn('[reminders] Notion archive failed:', err.message)
    }
  }
  setCache(userId, userReminders.filter((r) => r.id !== id))
  await writeSnapshot()
  return { ok: true }
}

export async function act(id, action, clientTime = {}, userId = '__local__') {
  const userReminders = getCache(userId)
  const existing = userReminders.find((r) => r.id === id)
  if (!existing) throw notFound()

  const tzOffset = Number.isInteger(clientTime.tzOffset) ? clientTime.tzOffset : null
  const events = [...(existing.dismissalEvents || []), buildEvent(action, clientTime)].slice(-MAX_EVENTS)
  const patch = {
    dismissalEvents: events,
    rescheduledByEngine: existing.rescheduledByEngine || false,
    rescheduleDate: existing.rescheduleDate || null,
    hiddenUntil: existing.hiddenUntil || null,
  }

  if (action === 'done') {
    if (existing.recurrence !== 'none' && existing.datetime) {
      const next = nextOccurrence(existing, new Date())
      patch.done = false
      if (next) patch.datetime = next
    } else {
      patch.done = true
    }
  } else if (action === 'snooze') {
    const smart = engine.suggestSnooze(userReminders, existing, new Date(), tzOffset)
    if (smart) {
      patch.datetime = smart.datetime
    } else {
      const base = existing.datetime ? new Date(existing.datetime) : new Date()
      patch.datetime = new Date(base.getTime() + 60 * 60 * 1000).toISOString()
    }
    patch.hiddenUntil = null
  } else if (action === 'not_now') {
    patch.hiddenUntil = new Date(endOfUserDay(Date.now(), tzOffset)).toISOString()
  }

  return writePatch(existing, patch, userId)
}

export async function refresh(userId = '__local__') {
  if (mode === 'notion') {
    const allReminders = await notion.listFromNotion(config.notionDatabaseId)
    cache.clear()
    for (const r of allReminders) {
      const uid = r.userId || '__local__'
      if (!cache.has(uid)) cache.set(uid, [])
      cache.get(uid).push(r)
    }
  } else {
    const snapshot = await readSnapshot()
    cache.clear()
    for (const [uid, list] of Object.entries(snapshot)) {
      cache.set(uid, Array.isArray(list) ? list : [])
    }
  }
  await writeSnapshot()
  return getCache(userId)
}

// ── internals ────────────────────────────────────────────────────────────
async function writePatch(existing, patch, userId) {
  if (mode === 'notion') {
    const updated = await notion.updateInNotion(existing.id, withCompleteEngineFields(existing, patch))
    const newList = getCache(userId).map((r) => (r.id === existing.id ? { ...updated, userId } : r))
    setCache(userId, newList)
  } else {
    const updated = { ...existing, ...normalize({ ...existing, ...patch }), userId }
    setCache(userId, getCache(userId).map((r) => (r.id === existing.id ? updated : r)))
  }
  await writeSnapshot()
  return getCache(userId).find((r) => r.id === existing.id)
}

function withCompleteEngineFields(existing, patch) {
  if (!ENGINE_KEYS.some((k) => k in patch)) return patch
  return {
    ...patch,
    dismissalEvents: patch.dismissalEvents ?? existing.dismissalEvents ?? [],
    rescheduledByEngine: patch.rescheduledByEngine ?? existing.rescheduledByEngine ?? false,
    rescheduleDate: patch.rescheduleDate ?? existing.rescheduleDate ?? null,
    hiddenUntil: patch.hiddenUntil ?? existing.hiddenUntil ?? null,
  }
}

function buildEvent(action, { localHour, localDay } = {}) {
  const d = new Date()
  const hour = Number.isInteger(localHour) ? localHour : d.getHours()
  const day = Number.isInteger(localDay) ? localDay : d.getDay()
  return { action, timestamp: d.toISOString(), day_of_week: day, hour_of_day: hour }
}

function notFound() {
  const e = new Error('Reminder not found')
  e.status = 404
  return e
}

function normalize(fields = {}) {
  const recurrence = ['none', 'daily', 'weekly', 'monthly', 'custom'].includes(fields.recurrence) ? fields.recurrence : 'none'
  const priority = ['low', 'medium', 'high'].includes(fields.priority) ? fields.priority : 'medium'
  const category = ['work', 'personal', 'health', 'finance', 'other'].includes(fields.category) ? fields.category : null
  return {
    title: String(fields.title || '').trim() || 'Untitled reminder',
    datetime: fields.datetime || null,
    recurrence,
    recurrenceDetail: String(fields.recurrenceDetail || ''),
    priority,
    done: Boolean(fields.done),
    notes: String(fields.notes || ''),
    category,
    location: String(fields.location || ''),
    gcalEventId: fields.gcalEventId || null,
    checklist: Array.isArray(fields.checklist) ? fields.checklist : [],
    dismissalEvents: Array.isArray(fields.dismissalEvents) ? fields.dismissalEvents.slice(-MAX_EVENTS) : [],
    rescheduledByEngine: Boolean(fields.rescheduledByEngine),
    rescheduleDate: fields.rescheduleDate || null,
    hiddenUntil: fields.hiddenUntil || null,
  }
}
