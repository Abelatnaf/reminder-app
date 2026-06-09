import { useCallback, useEffect, useState } from 'react'

// Minimal History-API router (no dependency). Enough for two routes:
// "/" (the app) and "/stats".
export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }, [])

  return { path, navigate }
}
