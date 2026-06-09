// src/components/InstallBanner.jsx
// Shows a subtle "Install app" banner when the browser exposes the install prompt.
// Drop this anywhere in your layout — it self-hides when not applicable.
//
// Usage:
//   import InstallBanner from './components/InstallBanner';
//   // In your root layout or App.jsx:
//   <InstallBanner />

import { useState } from 'react';
import { usePWA } from '../hooks/usePWA'; // adjust path if you move the hook

export default function InstallBanner() {
  const { canInstall, installPWA, isOnline } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  // Nothing to show
  if (!canInstall || dismissed) return null;

  return (
    <div
      role="banner"
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3
        px-4 py-3 rounded-2xl shadow-lg
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-700
        text-sm text-neutral-800 dark:text-neutral-100
        max-w-sm w-[calc(100%-2rem)]
        animate-in slide-in-from-bottom-4 duration-300
      "
    >
      {/* App icon */}
      <img src="/icon.svg" alt="" className="w-8 h-8 rounded-xl flex-shrink-0" />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">Add to Home Screen</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          Install for quick access, offline use
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="
            text-xs text-neutral-500 dark:text-neutral-400
            hover:text-neutral-700 dark:hover:text-neutral-200
            px-2 py-1 rounded-lg
          "
          aria-label="Dismiss install banner"
        >
          Not now
        </button>
        <button
          onClick={async () => {
            const outcome = await installPWA();
            if (outcome === 'accepted') setDismissed(true);
          }}
          className="
            text-xs font-semibold
            bg-red-500 hover:bg-red-600 active:bg-red-700
            text-white
            px-3 py-1.5 rounded-lg
            transition-colors
          "
        >
          Install
        </button>
      </div>

      {/* Offline pill */}
      {!isOnline && (
        <span className="
          absolute -top-2 right-3
          text-[10px] font-medium
          bg-yellow-400 text-yellow-900
          px-2 py-0.5 rounded-full
        ">
          Offline
        </span>
      )}
    </div>
  );
}
