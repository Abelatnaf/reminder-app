// IndexedDB-backed mutation queue. Entries are replayed in FIFO order when the
// device comes back online. The API layer enqueues; this module drains.

const DB_NAME = 'reminder-offline-v1'
const STORE = 'queue'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { autoIncrement: true, keyPath: 'qid' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueue(entry) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add({ ...entry, enqueuedAt: Date.now() })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function dequeue(qid) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(qid)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function countPending() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Replay all queued mutations in order. Returns { sent, failed }.
export async function flush() {
  const entries = await getAll()
  if (!entries.length) return { sent: 0, failed: 0 }

  let sent = 0, failed = 0
  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: entry.body ?? undefined,
      })
      if (res.ok) {
        await dequeue(entry.qid)
        sent++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }
  return { sent, failed }
}

// Call once (from App.jsx or main.jsx) to wire up the online event.
// onFlushed is called after a successful flush so the UI can reload.
export function initOfflineSync(onFlushed) {
  window.addEventListener('online', async () => {
    const { sent, failed } = await flush()
    if (sent > 0) onFlushed?.({ sent, failed })
  })
}
