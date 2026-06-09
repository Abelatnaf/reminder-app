import './env.js'
import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hmac, safeEqual, encrypt, decrypt } from './secret.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = path.join(__dirname, 'gcal-tokens.json')
const STATE_TTL_MS = 10 * 60 * 1000 // OAuth state is valid for 10 minutes

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

// ── Token persistence ─────────────────────────────────────────────────────────

// Tokens are encrypted at rest (AES-256-GCM). Falls back to reading legacy
// plaintext JSON so existing files keep working until the next write.
function loadTokens() {
  let raw
  try { raw = fs.readFileSync(TOKENS_PATH, 'utf8') } catch { return {} }
  if (!raw.trim()) return {}
  try {
    if (raw.startsWith('v1.')) return JSON.parse(decrypt(raw))
    return JSON.parse(raw) // legacy plaintext — migrated to ciphertext on next save
  } catch {
    return {}
  }
}

function saveTokens(all) {
  fs.writeFileSync(TOKENS_PATH, encrypt(JSON.stringify(all)), { mode: 0o600 })
}

// ── Signed OAuth state (CSRF / forgery protection) ────────────────────────────
// State binds the flow to a userId and is HMAC-signed so the callback can't be
// called with an attacker-chosen userId. Format: <payload>.<sig> (both base64url).
function signState(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url')
  return `${payload}.${hmac(payload)}`
}

function verifyState(state) {
  const [payload, sig] = String(state).split('.')
  if (!payload || !sig || !safeEqual(sig, hmac(payload))) {
    const e = new Error('Invalid OAuth state'); e.status = 400; throw e
  }
  const { userId, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString())
  if (!userId || Date.now() - ts > STATE_TTL_MS) {
    const e = new Error('Expired OAuth state'); e.status = 400; throw e
  }
  return userId
}

// ── OAuth2 client factory ─────────────────────────────────────────────────────

// Resolve the OAuth callback URL. Prefer an explicit GOOGLE_REDIRECT_URI, else
// derive it from the public deploy origin (APP_URL / Railway domain) so it isn't
// silently stuck on localhost in production — the usual cause of redirect_uri_mismatch.
// NOTE: whatever this resolves to must also be listed as an Authorized redirect URI
// in the Google Cloud Console OAuth client.
export function getRedirectUri() {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI
  // Prefer Railway's auto-set domain (always correct in prod) over APP_URL, which
  // can be a stale localhost value copied from .env.example.
  const base =
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3001}`
  return `${base.replace(/\/$/, '')}/api/gcal/callback`
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

// Returns the Google consent URL. State is HMAC-signed so the callback can
// trust the userId it carries without a session.
export function getAuthUrl(userId) {
  return createOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh_token every time
    scope: SCOPES,
    state: signState(userId),
  })
}

// Exchange the auth code from Google's callback. Saves tokens keyed by userId.
export async function handleCallback(code, state) {
  const userId = verifyState(state) // throws on tampered/expired state
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  // Fetch the user's email for display in Settings
  const oauthInfo = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauthInfo.userinfo.get()

  const all = loadTokens()
  all[userId] = { ...tokens, email: userInfo.email }
  saveTokens(all)

  return { userId, email: userInfo.email }
}

// { connected: bool, email: string|null, pushEnabled: bool }
export function getStatus(userId) {
  const t = loadTokens()[userId]
  if (!t) return { connected: false, email: null, pushEnabled: false }
  return { connected: true, email: t.email || null, pushEnabled: !!t.pushEnabled }
}

export function isConnected(userId) {
  return !!loadTokens()[userId]
}

export function isPushEnabled(userId) {
  return !!loadTokens()[userId]?.pushEnabled
}

export function setPushEnabled(userId, enabled) {
  const all = loadTokens()
  if (all[userId]) {
    all[userId].pushEnabled = Boolean(enabled)
    saveTokens(all)
  }
}

// Build an authenticated Google Calendar client; saves refreshed tokens automatically.
async function getCalendarClient(userId) {
  const all = loadTokens()
  const tokens = all[userId]
  if (!tokens) {
    const e = new Error('Google Calendar not connected')
    e.status = 400
    throw e
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials(tokens)

  oauth2Client.on('tokens', (newTokens) => {
    const current = loadTokens()
    current[userId] = { ...current[userId], ...newTokens }
    saveTokens(current)
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// Pull upcoming events (next 30 days) from the user's primary Google Calendar.
// Returns reminder-shaped objects — caller is responsible for creating them in the store.
export async function syncFromGoogle(userId) {
  const calendar = await getCalendarClient(userId)
  const now = new Date().toISOString()
  const maxTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now,
    timeMax: maxTime,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  return (data.items || []).map(eventToReminder)
}

// Push a reminder as a Google Calendar event.
export async function pushToGoogle(userId, reminder) {
  const calendar = await getCalendarClient(userId)

  const event = {
    summary: reminder.title,
    description: reminder.notes || '',
    location: reminder.location || '',
    start: reminder.datetime
      ? { dateTime: reminder.datetime, timeZone: 'UTC' }
      : { date: new Date().toISOString().split('T')[0] },
    end: reminder.datetime
      ? { dateTime: new Date(new Date(reminder.datetime).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'UTC' }
      : { date: new Date().toISOString().split('T')[0] },
  }

  if (reminder.gcalEventId) {
    const { data } = await calendar.events.update({ calendarId: 'primary', eventId: reminder.gcalEventId, requestBody: event })
    return data.id
  }
  const { data } = await calendar.events.insert({ calendarId: 'primary', requestBody: event })
  return data.id
}

// Revoke tokens and remove them from storage.
export async function disconnect(userId) {
  const all = loadTokens()
  const tokens = all[userId]
  if (tokens?.access_token) {
    try {
      await createOAuth2Client().revokeToken(tokens.access_token)
    } catch { /* already expired or revoked */ }
  }
  delete all[userId]
  saveTokens(all)
}

// ── Private helpers ───────────────────────────────────────────────────────────

function eventToReminder(event) {
  const start = event.start?.dateTime || event.start?.date
  const meetLink = event.hangoutLink ||
    (event.conferenceData?.entryPoints || []).find(e => e.entryPointType === 'video')?.uri || ''

  const notes = [event.description || '', meetLink].filter(Boolean).join('\n').trim()

  return {
    title: event.summary || 'Untitled event',
    datetime: start ? new Date(start).toISOString() : null,
    location: event.location || '',
    notes,
    priority: 'medium',
    recurrence: 'none',
    recurrenceDetail: '',
    gcalEventId: event.id,
  }
}
