// src/hooks/usePWA.js
// Registers the service worker, exposes install prompt, and tracks online status.
//
// Usage:
//   const { isOnline, canInstall, installPWA, swState } = usePWA();
//
//   canInstall  — true when the browser's beforeinstallprompt fired (Android Chrome)
//   installPWA  — call this on a button click to trigger the native install dialog
//   isOnline    — live navigator.onLine value
//   swState     — 'installing' | 'waiting' | 'active' | 'unsupported' | null

import { useState, useEffect, useCallback } from 'react';

export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const [swState, setSwState] = useState(null);

  // ── Online / offline ────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ── Install prompt (Android Chrome / Edge) ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); // stop mini-infobar
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return outcome; // 'accepted' | 'dismissed'
  }, [deferredPrompt]);

  // ── Service Worker registration ─────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setSwState('unsupported');
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        const track = (sw) => {
          if (!sw) return;
          setSwState(sw.state);
          sw.addEventListener('statechange', () => setSwState(sw.state));
        };

        if (reg.installing) { setSwState('installing'); track(reg.installing); }
        else if (reg.waiting) { setSwState('waiting'); track(reg.waiting); }
        else if (reg.active) { setSwState('active'); track(reg.active); }

        reg.addEventListener('updatefound', () => {
          setSwState('installing');
          track(reg.installing);
        });
      })
      .catch((err) => {
        console.error('[PWA] SW registration failed:', err);
        setSwState('unsupported');
      });
  }, []);

  return { isOnline, canInstall, installPWA, swState };
}
