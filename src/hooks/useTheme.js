import { useCallback, useEffect, useState } from 'react'

// Dark/light theme. The initial class is set by an inline script in index.html
// (before paint); this hook keeps React state in sync and persists changes.
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [theme])

  // Optional pointer event lets the View Transition reveal originate from the
  // toggle button. Falls back to an instant theme swap when the API or
  // reduced-motion preference rules out the animated wipe.
  const toggle = useCallback((e) => {
    const flip = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || prefersReduced) {
      flip()
      return
    }

    const root = document.documentElement
    const x = e?.clientX ?? window.innerWidth - 40
    const y = e?.clientY ?? 24
    root.style.setProperty('--vt-x', `${(x / window.innerWidth) * 100}%`)
    root.style.setProperty('--vt-y', `${(y / window.innerHeight) * 100}%`)
    document.startViewTransition(flip)
  }, [])

  return { theme, toggle }
}
