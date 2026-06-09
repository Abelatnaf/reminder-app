// Web Push (VAPID) — fires reminders even when the tab is closed.
// Subscriptions are now keyed by userId: { [userId]: [sub, ...] }

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'
import { runtime, persistRuntime } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SUBS_FILE = path.join(__dirname, 'subscriptions.json')

let vapid = null
// { [userId]: PushSubscription[] }
let subsByUser = {}
let ready = false

function loadSubscriptions() {
  try {
    const data = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'))
    // Legacy: plain array → migrate to single '__local__' user.
    if (Array.isArray(data)) {
      subsByUser = { __local__: data }
    } else {
      subsByUser = data || {}
    }
  } catch {
    subsByUser = {}
  }
}

function saveSubscriptions() {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subsByUser, null, 2))
  } catch (err) {
    console.warn('[push] could not save subscriptions:', err.message)
  }
}

export function initPush() {
  let publicKey = (process.env.VAPID_PUBLIC || '').trim() || runtime.vapidPublic
  let privateKey = (process.env.VAPID_PRIVATE || '').trim() || runtime.vapidPrivate
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys()
    publicKey = keys.publicKey
    privateKey = keys.privateKey
    persistRuntime({ vapidPublic: publicKey, vapidPrivate: privateKey })
    console.log('[push] generated VAPID keys (saved to .runtime.json)')
  }
  const subject = (process.env.VAPID_SUBJECT || '').trim() || 'mailto:reminders@localhost'
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapid = { publicKey, privateKey, subject }
  loadSubscriptions()
  ready = true
  const total = Object.values(subsByUser).reduce((s, l) => s + l.length, 0)
  console.log(`[push] ready — ${total} subscription(s)`)
}

export const isReady = () => ready
export const getPublicKey = () => (vapid ? vapid.publicKey : null)
export const count = () => Object.values(subsByUser).reduce((s, l) => s + l.length, 0)
export const userSubs = (userId) => subsByUser[userId] || []
export const allUserIds = () => Object.keys(subsByUser)

export function addSubscription(sub, userId = '__local__') {
  if (!sub || !sub.endpoint) return false
  if (!subsByUser[userId]) subsByUser[userId] = []
  if (!subsByUser[userId].some((s) => s.endpoint === sub.endpoint)) {
    subsByUser[userId].push(sub)
    saveSubscriptions()
  }
  return true
}

export function removeSubscription(endpoint, userId = '__local__') {
  if (!subsByUser[userId]) return
  const before = subsByUser[userId].length
  subsByUser[userId] = subsByUser[userId].filter((s) => s.endpoint !== endpoint)
  if (subsByUser[userId].length !== before) saveSubscriptions()
}

// Send to one subscription (confirmation ping on subscribe).
export async function sendTo(sub, payload) {
  if (!ready || !sub) return false
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload))
    return true
  } catch (err) {
    if (err && (err.statusCode === 404 || err.statusCode === 410)) {
      // Prune from whichever user owns this endpoint.
      for (const userId of Object.keys(subsByUser)) {
        removeSubscription(sub.endpoint, userId)
      }
    } else {
      console.warn('[push] sendTo failed:', err && err.statusCode)
    }
    return false
  }
}

// Send to all subscriptions for one user.
export async function sendToUser(userId = '__local__', payload) {
  if (!ready) return { sent: 0, removed: 0 }
  const subs = subsByUser[userId] || []
  if (!subs.length) return { sent: 0, removed: 0 }
  const body = JSON.stringify(payload)
  const dead = []
  let sent = 0
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body)
        sent++
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(sub.endpoint)
        else console.warn('[push] send failed:', err && err.statusCode)
      }
    })
  )
  if (dead.length) {
    subsByUser[userId] = subs.filter((s) => !dead.includes(s.endpoint))
    saveSubscriptions()
  }
  return { sent, removed: dead.length }
}

// Fan out to ALL users' subscriptions (kept for backwards-compat / test route).
export async function sendToAll(payload) {
  if (!ready) return { sent: 0, removed: 0 }
  const results = await Promise.all(Object.keys(subsByUser).map((uid) => sendToUser(uid, payload)))
  return results.reduce((acc, r) => ({ sent: acc.sent + r.sent, removed: acc.removed + r.removed }), { sent: 0, removed: 0 })
}
