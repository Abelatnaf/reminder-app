// Due-reminder scheduler. Runs server-side so notifications fire even when no
// browser tab is open — the half of the app's promise the in-page timer can't keep.
//
// Each tick notifies reminders whose due time crossed *during the elapsed window*
// (lastTick, now]. That naturally ignores items already overdue when the server
// started (no retroactive spam) and re-arms recurring reminders automatically,
// since completing one rolls its `datetime` forward to a new occurrence.

import * as store from './reminders.js'
import * as push from './push.js'
import { runtime, persistRuntime } from './config.js'
import { resolveStartTick } from './time.js'
import { sendEmail, digestEmail } from './email.js'
import { getAllUsers } from './db.js'

// How far back we'll catch up on boot. A brief restart re-fires reminders that
// came due while down; a long outage is capped so we don't unleash a flood.
const MAX_CATCHUP_MS = 6 * 60 * 60 * 1000

let timer = null
let digestTimer = null
let lastTick = 0
const fired = new Set() // `${id}:${datetime}` guard against double-sends

function bodyFor(r) {
  try {
    const t = new Date(r.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return r.notes ? `${t} · ${r.notes}` : `Due now · ${t}`
  } catch {
    return 'Due now'
  }
}

async function tick() {
  const now = Date.now()
  // Fire per-user so each notification reaches only that user's devices.
  for (const userId of push.allUserIds()) {
    for (const r of store.list(userId)) {
      if (r.done || !r.datetime) continue
      const due = new Date(r.datetime).getTime()
      if (Number.isNaN(due)) continue
      const key = `${r.id}:${r.datetime}`
      if (due > lastTick && due <= now && !fired.has(key)) {
        fired.add(key)
        await push.sendToUser(userId, {
          title: `⏰ ${r.title}`,
          body: bodyFor(r),
          tag: r.id,
          data: { id: r.id, url: '/' },
        })
      }
    }
  }
  lastTick = now
  persistRuntime({ schedulerLastTick: now })
  if (fired.size > 1000) fired.clear()
}

// ── Daily email digest ────────────────────────────────────────────────────────

async function sendDigests() {
  const users = await getAllUsers()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000

  for (const user of users) {
    const reminders = store.list(user.id)
    const active = reminders.filter((r) => !r.done && r.datetime)

    const overdue = active.filter((r) => new Date(r.datetime).getTime() < todayStart)
    const dueToday = active.filter((r) => {
      const t = new Date(r.datetime).getTime()
      return t >= todayStart && t < todayEnd
    })

    if (overdue.length === 0 && dueToday.length === 0) continue

    await sendEmail({
      to: user.email,
      subject: `📋 Your day — ${overdue.length + dueToday.length} reminder${overdue.length + dueToday.length === 1 ? '' : 's'}`,
      html: digestEmail(user.name, dueToday, overdue),
    })
  }
}

// Schedule digest to fire at 8am server time every day.
function scheduleNextDigest() {
  const now = new Date()
  const next8am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0)
  if (next8am.getTime() <= now.getTime()) next8am.setDate(next8am.getDate() + 1)
  const delay = next8am.getTime() - now.getTime()
  digestTimer = setTimeout(() => {
    sendDigests().catch((e) => console.error('[scheduler] digest error:', e))
    // Re-schedule for the following day after each fire
    scheduleNextDigest()
  }, delay)
  const hm = next8am.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  console.log(`[scheduler] next digest at ${hm}`)
}

export function startScheduler({ intervalMs = 30000 } = {}) {
  if (timer) return
  // Resume from the last persisted tick (bounded) so reminders that came due while
  // the server was restarting still fire, instead of being silently dropped.
  lastTick = resolveStartTick(runtime.schedulerLastTick, Date.now(), MAX_CATCHUP_MS)
  timer = setInterval(() => tick().catch((e) => console.error('[scheduler]', e)), intervalMs)
  console.log(`[scheduler] running — checking every ${Math.round(intervalMs / 1000)}s`)
  scheduleNextDigest()
}

export function stopScheduler() {
  if (timer) { clearInterval(timer); timer = null }
  if (digestTimer) { clearTimeout(digestTimer); digestTimer = null }
}
