import { useCallback, useEffect, useRef, useState } from 'react'

const supported = typeof window !== 'undefined' && 'Notification' in window

// Fires a desktop notification when a reminder becomes due/overdue while the tab
// is open. Each occurrence notifies at most once. No-ops gracefully if the user
// hasn't granted permission.
export function useDueNotifications(reminders, enabled) {
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported')
  const notified = useRef(new Set())

  const request = useCallback(async () => {
    if (!supported) return 'unsupported'
    const p = await Notification.requestPermission()
    setPermission(p)
    return p
  }, [])

  useEffect(() => {
    if (!enabled || permission !== 'granted') return

    const check = () => {
      const now = Date.now()
      for (const r of reminders) {
        if (r.done || !r.datetime) continue
        const due = new Date(r.datetime).getTime()
        if (Number.isNaN(due)) continue
        const key = `${r.id}:${r.datetime}`
        if (due <= now && !notified.current.has(key)) {
          notified.current.add(key)
          try {
            new Notification('⏰ Reminder due', { body: r.title, tag: r.id })
          } catch {
            /* ignore */
          }
        }
      }
    }

    check()
    const id = setInterval(check, 60 * 1000)
    return () => clearInterval(id)
  }, [reminders, enabled, permission])

  return { supported, permission, request }
}
