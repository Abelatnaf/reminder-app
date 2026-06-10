import './env.js' // MUST be first — loads .env before any module reads process.env
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth.js'
import { config, isAiConfigured, isNotionConfigured } from './config.js'
import * as store from './reminders.js'
import * as push from './push.js'
import { startScheduler } from './scheduler.js'
import { parseReminder, executeAICommand, AIError } from './ai.js'
import * as gcal from './googlecal.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, '..', 'dist')
const servePwa = fs.existsSync(path.join(DIST_DIR, 'index.html'))

const app = express()

// Trust Railway's reverse proxy so rate-limit and IP detection work correctly
app.set('trust proxy', 1)

const isProd = process.env.NODE_ENV === 'production'

// Content-Security-Policy. The app is same-origin (Express serves the PWA and the
// API together in prod), styles are inline, the grain texture is a data: URI, and
// the only external reference is a maps.google.com anchor (navigation, not a load).
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
}))

// CORS — only allow localhost outside production.
const allowedOrigins = [
  process.env.APP_URL,
  process.env.FRONTEND_URL,
  process.env.BETTER_AUTH_URL,
  ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] : []),
  ...(isProd ? [] : ['http://localhost:5173', 'http://localhost:3001']),
].filter(Boolean)
app.use(cors({ origin: allowedOrigins, credentials: true }))

// Rate limits
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false })
const parseLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })
// Strict limiter for credential endpoints — blunts password brute-force. Scoped
// to the sensitive actions so routine session checks aren't throttled; only
// failed attempts count, so a legitimate login is never blocked.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true })
app.use('/api', apiLimiter)
app.use(['/api/auth/sign-in', '/api/auth/sign-up', '/api/auth/forget-password', '/api/auth/reset-password'], authLimiter)

// better-auth handles all /api/auth/* routes (sign-in, sign-up, sign-out, session, etc.)
// Express 5 requires named wildcards — /api/auth/*path instead of /api/auth/*
app.all('/api/auth/*path', toNodeHandler(auth))

app.use(express.json({ limit: '1mb' }))

app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) console.log(`${req.method} ${req.path}`)
  next()
})

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Extract and verify session — rejects with 401 if not signed in.
async function getUid(req) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    const e = new Error('Unauthorized')
    e.status = 401
    throw e
  }
  return session.user.id
}

// ── Public routes ────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ready: store.isReady(),
    mode: store.getMode(),
    notionConfigured: isNotionConfigured(),
    aiConfigured: isAiConfigured(),
    provider: 'groq',
    databaseId: config.notionDatabaseId || null,
    model: config.groqModel,
    pushReady: push.isReady(),
    pushSubscriptions: push.count(),
  })
})

app.get('/api/push/vapid-public-key', (_req, res) => {
  res.json({ key: push.getPublicKey() })
})

// ── Authenticated routes ──────────────────────────────────────────────────────

app.get('/api/reminders', asyncHandler(async (req, res) => {
  res.json(store.list(await getUid(req)))
}))

app.post('/api/reminders', asyncHandler(async (req, res) => {
  const created = await store.create(req.body || {}, await getUid(req))
  res.status(201).json(created)
}))

app.put('/api/reminders/:id', asyncHandler(async (req, res) => {
  res.json(await store.update(req.params.id, req.body || {}, await getUid(req)))
}))

app.delete('/api/reminders/:id', asyncHandler(async (req, res) => {
  res.json(await store.remove(req.params.id, await getUid(req)))
}))

app.post('/api/reminders/:id/action', asyncHandler(async (req, res) => {
  const { action, localHour, localDay, tzOffset } = req.body || {}
  if (!['done', 'snooze', 'not_now'].includes(action)) {
    const e = new Error('action must be one of: done, snooze, not_now')
    e.status = 400
    throw e
  }
  res.json(await store.act(req.params.id, action, { localHour, localDay, tzOffset }, await getUid(req)))
}))

app.get('/api/reminders/:id/suggest-time', asyncHandler(async (req, res) => {
  res.json(store.suggestTime(req.params.id, await getUid(req)))
}))

app.get('/api/patterns', asyncHandler(async (req, res) => {
  res.json(store.patterns(await getUid(req)))
}))

app.post('/api/parse-reminder', parseLimiter, asyncHandler(async (req, res) => {
  await getUid(req) // auth check
  const { text, now, timezone } = req.body || {}
  const parsed = await parseReminder({ text, now: now || new Date().toISOString(), timezone: timezone || 'UTC' })
  res.json(parsed)
}))

app.post('/api/ai-command', parseLimiter, asyncHandler(async (req, res) => {
  const userId = await getUid(req)
  const { text, now, timezone } = req.body || {}
  const reminders = store.list(userId)
  const result = await executeAICommand({ text, reminders, now: now || new Date().toISOString(), timezone: timezone || 'UTC' })

  const affected = []
  for (const op of result.ops) {
    if (!op.ids?.length) continue
    for (const id of op.ids) {
      try {
        if (op.action === 'update' && op.patch) {
          affected.push(await store.update(id, op.patch, userId))
        } else if (op.action === 'done') {
          affected.push(await store.act(id, 'done', {}, userId))
        } else if (op.action === 'delete') {
          await store.remove(id, userId)
          affected.push({ id, deleted: true })
        } else if (op.action === 'query') {
          const found = store.list(userId).find((r) => r.id === id)
          if (found) affected.push(found)
        }
      } catch (err) {
        console.warn('[ai-command] op failed for id', id, ':', err.message)
      }
    }
  }

  res.json({ summary: result.summary, ops: result.ops, affected })
}))

// ── Google Calendar ───────────────────────────────────────────────────────────

// Redirect to Google OAuth consent screen
app.get('/api/gcal/auth', asyncHandler(async (req, res) => {
  if (!gcal.isConfigured()) {
    const e = new Error('Google Calendar not configured — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env')
    e.status = 503
    throw e
  }
  const userId = await getUid(req)
  res.redirect(gcal.getAuthUrl(userId))
}))

// Google redirects here after user consents — no session needed, userId is in state
app.get('/api/gcal/callback', asyncHandler(async (req, res) => {
  const { code, state, error } = req.query
  if (error) return res.redirect(`/settings?gcal=error&msg=${encodeURIComponent(error)}`)
  if (!code || !state) return res.redirect('/settings?gcal=error&msg=missing_params')
  try {
    await gcal.handleCallback(String(code), String(state))
    res.redirect('/settings?gcal=connected')
  } catch (err) {
    console.error('[gcal callback]', err.message)
    res.redirect(`/settings?gcal=error&msg=${encodeURIComponent(err.message)}`)
  }
}))

app.get('/api/gcal/status', asyncHandler(async (req, res) => {
  const userId = await getUid(req)
  res.json({ ...(await gcal.getStatus(userId)), configured: gcal.isConfigured(), redirectUri: gcal.getRedirectUri() })
}))

// Import upcoming Google Calendar events as reminders (skips duplicates by gcalEventId)
app.post('/api/gcal/sync', asyncHandler(async (req, res) => {
  const userId = await getUid(req)
  const events = await gcal.syncFromGoogle(userId)
  const existing = store.list(userId)
  const existingGcalIds = new Set(existing.map((r) => r.gcalEventId).filter(Boolean))
  let created = 0
  for (const ev of events) {
    if (existingGcalIds.has(ev.gcalEventId)) continue
    await store.create(ev, userId)
    created++
  }
  res.json({ synced: created, total: events.length })
}))

app.delete('/api/gcal/disconnect', asyncHandler(async (req, res) => {
  await gcal.disconnect(await getUid(req))
  res.json({ ok: true })
}))

app.put('/api/gcal/settings', asyncHandler(async (req, res) => {
  const userId = await getUid(req)
  const { pushEnabled } = req.body || {}
  await gcal.setPushEnabled(userId, !!pushEnabled)
  res.json({ ok: true, pushEnabled: !!pushEnabled })
}))

// ── Push notifications ────────────────────────────────────────────────────────

app.post('/api/push/subscribe', asyncHandler(async (req, res) => {
  const sub = req.body
  if (!sub || !sub.endpoint) { const e = new Error('Invalid push subscription'); e.status = 400; throw e }
  push.addSubscription(sub, await getUid(req))
  push.sendTo(sub, { title: '🔔 Alerts on', body: "You'll be reminded even when the app is closed.", tag: 'welcome', data: { url: '/' } }).catch(() => {})
  res.status(201).json({ ok: true })
}))

app.post('/api/push/unsubscribe', asyncHandler(async (req, res) => {
  push.removeSubscription(req.body?.endpoint, await getUid(req))
  res.json({ ok: true })
}))

app.post('/api/push/test', asyncHandler(async (req, res) => {
  res.json(await push.sendToUser(await getUid(req), { title: '✅ Test notification', body: 'Push is working.', tag: 'test', data: { url: '/' } }))
}))

// ── Export ────────────────────────────────────────────────────────────────────

function escCsv(val) {
  if (val == null) return ''
  let s = String(val)
  // Neutralize spreadsheet formula injection: a leading = + - @ (or tab/CR) can
  // execute as a formula when the file is opened in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

app.get('/api/export/csv', asyncHandler(async (req, res) => {
  const userId = await getUid(req)
  const reminders = store.list(userId)
  const header = ['title', 'datetime', 'recurrence', 'priority', 'category', 'notes', 'location', 'done']
  const rows = reminders.map((r) =>
    [r.title, r.datetime || '', r.recurrence || '', r.priority || '', r.category || '', r.notes || '', r.location || '', r.done ? 'true' : 'false']
      .map(escCsv).join(',')
  )
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="reminders.csv"')
  res.send([header.join(','), ...rows].join('\n'))
}))

function toIcsDate(isoStr) {
  const d = new Date(isoStr)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

const RRULE_MAP = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY' }

app.get('/api/export/ics', asyncHandler(async (req, res) => {
  const userId = await getUid(req)
  const reminders = store.list(userId)
  const dtstamp = toIcsDate(new Date().toISOString())
  const events = reminders
    .filter((r) => r.datetime)
    .map((r) => {
      const esc = (s) => (s || '').replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n')
      const lines = [
        'BEGIN:VEVENT',
        `UID:${r.id}@reminders`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${toIcsDate(r.datetime)}`,
        `SUMMARY:${esc(r.title)}`,
      ]
      if (r.notes) lines.push(`DESCRIPTION:${esc(r.notes)}`)
      if (r.location) lines.push(`LOCATION:${esc(r.location)}`)
      if (r.done) lines.push('STATUS:COMPLETED')
      if (RRULE_MAP[r.recurrence]) lines.push(`RRULE:${RRULE_MAP[r.recurrence]}`)
      lines.push('END:VEVENT')
      return lines.join('\r\n')
    })
  const cal = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReminderApp//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="reminders.ics"')
  res.send(cal)
}))

// ── PWA ───────────────────────────────────────────────────────────────────────

if (servePwa) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')))
  console.log('[server] Serving PWA from dist/')
}

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  const status = err.status || (err instanceof AIError ? err.status : 500)
  if (status >= 500) console.error('[error]', err)
  // Don't leak internal error details (DB/stack messages) to clients on 5xx.
  const message = status >= 500 ? 'Something went wrong.' : (err.message || 'Request failed.')
  res.status(status || 500).json({ error: message })
})

push.initPush()
gcal.init().catch((err) => console.error('[gcal init] failed:', err.message))
store.init().catch((err) => console.error('[init] failed:', err)).finally(() => {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n  Reminder server → http://localhost:${config.port}`)
    console.log(`  mode: ${store.getMode()}  |  AI: ${isAiConfigured() ? 'on' : 'off'}  |  Notion: ${isNotionConfigured() ? 'on' : 'off'}\n`)
  })
  startScheduler()
})
