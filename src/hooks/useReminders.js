import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api.js'

// Owns the reminder list + all CRUD/action calls. Mutations are optimistic with
// rollback on failure. Offline mutations are queued (via api.js) and kept in
// optimistic state rather than rolled back — the queue flushes on reconnect.

const OFFLINE_MSG = 'Queued — will sync when reconnected'

export function useReminders() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.list()
      setReminders(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (fields, { silent = false } = {}) => {
    try {
      const created = await api.create(fields)
      setReminders((prev) => [created, ...prev])
      if (!silent) toast.success('Reminder added')
      return created
    } catch (err) {
      if (err.offline) {
        // Add a pending placeholder so the user sees the reminder immediately.
        const pending = { id: crypto.randomUUID(), _pending: true, createdAt: new Date().toISOString(), ...fields }
        setReminders((prev) => [pending, ...prev])
        toast(OFFLINE_MSG, { icon: '📶' })
        return pending
      }
      toast.error(err.message || 'Could not add reminder')
      throw err
    }
  }, [])

  const update = useCallback(async (id, fields) => {
    let snapshot
    setReminders((cur) => {
      snapshot = cur
      return cur.map((r) => (r.id === id ? { ...r, ...fields } : r))
    })
    try {
      const updated = await api.update(id, fields)
      setReminders((cur) => cur.map((r) => (r.id === id ? updated : r)))
      return updated
    } catch (err) {
      if (err.offline) {
        // Keep optimistic state — the queued mutation will apply on reconnect.
        toast(OFFLINE_MSG, { icon: '📶' })
        return { id, ...fields }
      }
      if (snapshot) setReminders(snapshot)
      toast.error(err.message || 'Could not update reminder')
      throw err
    }
  }, [])

  const act = useCallback(async (reminder, action) => {
    let snapshot
    const optimistic = (r) => {
      if (action === 'done' && r.recurrence === 'none') return { ...r, done: true }
      if (action === 'snooze' && r.datetime) {
        return { ...r, datetime: new Date(new Date(r.datetime).getTime() + 3600000).toISOString() }
      }
      if (action === 'not_now') {
        const eod = new Date(); eod.setHours(23, 59, 59, 999)
        return { ...r, hiddenUntil: eod.toISOString() }
      }
      return r
    }
    setReminders((cur) => { snapshot = cur; return cur.map((r) => (r.id === reminder.id ? optimistic(r) : r)) })
    try {
      const updated = await api.action(reminder.id, action)
      setReminders((cur) => cur.map((r) => (r.id === reminder.id ? updated : r)))
      if (action === 'done') {
        toast.success(updated.recurrence !== 'none' && !updated.done ? 'Done — rolled to next occurrence' : 'Completed')
      } else if (action === 'snooze') {
        const t = updated.datetime ? new Date(updated.datetime).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : null
        toast.success(t ? `Snoozed → ${t}` : 'Snoozed')
      } else if (action === 'not_now') {
        toast('Hidden until tomorrow')
      }
      return updated
    } catch (err) {
      if (err.offline) {
        toast(OFFLINE_MSG, { icon: '📶' })
        return
      }
      if (snapshot) setReminders(snapshot)
      toast.error(err.message || 'Could not update reminder')
    }
  }, [])

  const toggle = useCallback(
    (reminder) => (reminder.done ? update(reminder.id, { done: false }) : act(reminder, 'done')),
    [update, act]
  )

  const remove = useCallback(async (id) => {
    let snapshot
    setReminders((cur) => { snapshot = cur; return cur.filter((r) => r.id !== id) })
    try {
      await api.remove(id)
      toast.success('Reminder deleted')
    } catch (err) {
      if (err.offline) {
        // Keep optimistically removed — queue will send the DELETE on reconnect.
        toast(OFFLINE_MSG, { icon: '📶' })
        return
      }
      if (snapshot) setReminders(snapshot)
      toast.error(err.message || 'Could not delete reminder')
    }
  }, [])

  return { reminders, loading, error, reload: load, create, update, act, toggle, remove }
}
