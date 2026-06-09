import { enqueue } from './offlineQueue.js'

// Thin fetch wrapper. All calls include the session cookie automatically.
async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// Attempt a mutation; if offline, queue it for later and throw a sentinel error.
async function mutate(method, url, body) {
  if (!navigator.onLine) {
    await enqueue({ method, url, body: body != null ? JSON.stringify(body) : undefined })
    const err = new Error('You\'re offline — this change will sync when reconnected.')
    err.offline = true
    throw err
  }
  return request(url, { method, body: body != null ? JSON.stringify(body) : undefined })
}

// Local ISO timestamp with UTC offset — lets the AI use the correct offset.
function localNow() {
  const d = new Date()
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(off / 60)}:${pad(off % 60)}`
  )
}

const clientContext = () => ({
  now: localNow(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

const localStamp = () => {
  const d = new Date()
  return { localHour: d.getHours(), localDay: d.getDay(), tzOffset: d.getTimezoneOffset() }
}

export const api = {
  health: () => request('/api/health'),
  list:   () => request('/api/reminders'),

  // Mutations go through mutate() so they're queued when offline.
  create: (body)     => mutate('POST',   '/api/reminders',        body),
  update: (id, body) => mutate('PUT',    `/api/reminders/${id}`,  body),
  remove: (id)       => mutate('DELETE', `/api/reminders/${id}`),

  // Actions include local clock data for the adaptive engine.
  action: (id, action) => mutate('POST', `/api/reminders/${id}/action`, { action, ...localStamp() }),

  suggestTime: (id) => request(`/api/reminders/${id}/suggest-time`),
  patterns:    ()   => request('/api/patterns'),
  parse: (text)     => request('/api/parse-reminder', { method: 'POST', body: JSON.stringify({ text, ...clientContext() }) }),

  // Web push
  push: {
    vapidKey:    ()    => request('/api/push/vapid-public-key'),
    subscribe:   (sub) => request('/api/push/subscribe',   { method: 'POST', body: JSON.stringify(sub) }),
    unsubscribe: (ep)  => request('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: ep }) }),
    test:        ()    => request('/api/push/test', { method: 'POST' }),
  },

  // Google Calendar integration
  gcal: {
    status:     ()  => request('/api/gcal/status'),
    sync:       ()  => request('/api/gcal/sync', { method: 'POST' }),
    disconnect: ()  => request('/api/gcal/disconnect', { method: 'DELETE' }),
    // "Connect" is a plain <a href="/api/gcal/auth"> — the browser follows the
    // server redirect to Google's consent page, no fetch needed.
    authUrl: '/api/gcal/auth',
  },
}
