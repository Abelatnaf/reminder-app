import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

// Real web-push: subscribes the browser to the server's VAPID keys so reminders
// arrive even when the app/tab is closed. Falls back gracefully where push isn't
// available, and flags the iOS "must install first" case so the UI can explain it.

const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
const pushSupported =
  swSupported && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window

const isIOS =
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '')
const isStandalone =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)

// VAPID public key (base64url) → Uint8Array for applicationServerKey.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function usePush() {
  const [permission, setPermission] = useState(
    pushSupported ? Notification.permission : 'unsupported'
  )
  const [subscribed, setSubscribed] = useState(false)

  // Reflect any existing subscription on mount (survives reloads).
  useEffect(() => {
    if (!pushSupported) return
    let cancelled = false
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setSubscribed(Boolean(sub))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!pushSupported) return 'unsupported'
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return perm
    try {
      const { key } = await api.push.vapidKey()
      if (!key) return 'error'
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }))
      await api.push.subscribe(sub.toJSON ? sub.toJSON() : sub)
      setSubscribed(true)
      return 'granted'
    } catch (err) {
      console.error('[push] subscribe failed:', err)
      return 'error'
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    if (!pushSupported) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.push.unsubscribe(sub.endpoint).catch(() => {})
        await sub.unsubscribe()
      }
    } catch (err) {
      console.error('[push] unsubscribe failed:', err)
    } finally {
      setSubscribed(false)
    }
  }, [])

  return {
    supported: pushSupported,
    needsInstall: isIOS && !isStandalone, // iOS Safari tab → must Add to Home Screen first
    permission,
    subscribed,
    subscribe,
    unsubscribe,
  }
}
