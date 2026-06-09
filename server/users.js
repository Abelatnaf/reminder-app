import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const USERS_FILE = path.join(__dirname, 'users.json')

// { [userId]: { plan: 'free'|'pro', stripeCustomerId: string|null, createdAt: string } }
function readAll() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function writeAll(data) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.warn('[users] Could not write users.json:', err.message)
  }
}

export function getUser(userId) {
  const all = readAll()
  return all[userId] || null
}

export function upsertUser(userId, patch) {
  const all = readAll()
  const existing = all[userId] || { plan: 'free', stripeCustomerId: null, createdAt: new Date().toISOString() }
  all[userId] = { ...existing, ...patch }
  writeAll(all)
  return all[userId]
}

export function ensureUser(userId) {
  const existing = getUser(userId)
  if (existing) return existing
  return upsertUser(userId, {})
}

export function getUserPlan(userId) {
  const user = getUser(userId)
  return user?.plan || 'free'
}
