import { useEffect, useRef, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { usePWA } from '../hooks/usePWA.js'
import { cn } from '../lib/cn.js'

// Detect if already running as installed PWA
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

// Detect iOS
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallButton() {
  const { canInstall, installPWA } = usePWA()
  const [installed, setInstalled] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const popoverRef = useRef(null)

  useEffect(() => {
    setInstalled(isStandalone())
  }, [])

  // Close popover on outside click
  useEffect(() => {
    if (!showIOSGuide) return
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowIOSGuide(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showIOSGuide])

  // Already installed — hide button
  if (installed) return null

  const handleClick = async () => {
    if (canInstall) {
      const outcome = await installPWA()
      if (outcome === 'accepted') setInstalled(true)
    } else {
      // iOS or unsupported — show manual instructions
      setShowIOSGuide((v) => !v)
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={handleClick}
        title="Install app"
        style={{ background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' }}
        className="glass-sheen grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm shadow-brand-600/30 transition-all ring-focus active:scale-95"
        aria-label="Install app"
      >
        <Download className="h-4 w-4" />
      </button>

      {showIOSGuide && (
        <div className="surface-modal absolute right-0 top-11 z-50 w-72 rounded-2xl p-4">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-sm font-semibold">Install Reminder</p>
            <button onClick={() => setShowIOSGuide(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          {isIOS() ? (
            <ol className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
                Tap the <Share className="inline h-3.5 w-3.5 text-blue-500" /> <strong>Share</strong> button at the bottom of Safari
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">2</span>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">3</span>
                Tap <strong>"Add"</strong> — the app appears on your home screen
              </li>
            </ol>
          ) : (
            <ol className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
                Click the <strong>⋮</strong> menu in your browser (top right)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">2</span>
                Click <strong>"Install Reminder"</strong> or <strong>"Add to Home Screen"</strong>
              </li>
            </ol>
          )}

          <p className="mt-3 text-[10px] text-zinc-400">Works offline once installed</p>
        </div>
      )}
    </div>
  )
}
