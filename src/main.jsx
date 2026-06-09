import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './index.css'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster, toast } from 'sonner'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'

// Register our service worker (sw.js in /public)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Update available', {
                description: 'A new version is ready.',
                action: { label: 'Reload', onClick: () => location.reload() },
                duration: Infinity,
              })
            }
          })
        })
      })
      .catch((err) => console.error('[SW] Registration failed:', err))
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
    <App />
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      theme="system"
      toastOptions={{
        duration: 3000,
        style: {
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: '14px',
        },
      }}
    />
    </MotionConfig>
  </React.StrictMode>
)
