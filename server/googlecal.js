import './env.js'
import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKENS_PATH = path.join(__dirname, 'gcal-tokens.json')

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

// ── Token persistence ─────────────────────────────────────────────────────────

function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')) } catch { return {} }
}

function saveTokens(all) {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(all, null, 2))
}

// ── OAuth2 client factory ─────────────────────────────────────────────────────

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/gcal/callback'
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

// Returns the Google consent URL. Encodes userId + nonce in state for CSRF protection.
export function getAuthUrl(userId) {
  const state = Buffer.from(
    JSON.stringify({ userId, nonce: crypto.randomBytes(8).toString('hex') })
  ).toString('base64url')

  return createOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh_token every time
    scope: SCOPES,
    state,
  })
}

// Exchange the auth code from Google's callback. Saves tokens keyed by userId.
export async function handleCallback(code, state) {
  const { userId } = JSON.parse(Buffer.from(state, 'base64url').toString())
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

// { connected: bool, email: string|null }
export function getStatus(userId) {
  const t = loadTokens()[userId]
  if (!t) return { connected: false, email: null }
  return { connected: true, email: t.email || null }
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
