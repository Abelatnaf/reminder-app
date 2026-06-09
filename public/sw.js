/* Custom service worker: real push notifications + light offline cache.
 *
 * Hand-rolled (no Workbox) so the app stays dependency-light and the push
 * lifecycle is explicit. Two jobs:
 *   1. push / notificationclick — the reason reminders fire when the tab is closed.
 *   2. a small network-first cache so the installed PWA opens offline.
 *
 * Dev guard: under the Vite dev server (:5173) we skip ALL fetch caching so
 * HMR is never served stale assets. Push still works in dev.
 */

const CACHE = 'calendar-v2'
const PRECACHE = ['/icon.svg', '/icon-192.png', '/icon-512.png', '/site.webmanifest']
const DEV = self.location.port === '5173'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  if (DEV) return // never intercept under Vite dev — let HMR through untouched
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api')) return // API is always live, never cached

  // App shell: network-first, fall back to the last good index.html offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    )
    return
  }

  // Built static assets: cache-first (they are content-hashed in production).
  if (/\.(?:js|css|png|svg|woff2?|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
            return res
          })
      )
    )
  }
})

// ── Push ────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: '⏰ Reminder', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || '⏰ Reminder'
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: data.data || {},
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Click → focus an open tab (deep-linking if asked) or open a new one ──────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if (target && target !== '/' && 'navigate' in client) client.navigate(target).catch(() => {})
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target)
    })()
  )
})
