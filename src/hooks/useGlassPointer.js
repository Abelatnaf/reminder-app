import { useCallback } from 'react'

// Tracks the pointer over a glass element and writes its position to CSS
// custom properties (--mx / --my), which the `.glass-glow` utility uses to
// place a soft specular highlight. Spread the returned handlers onto the element:
//
//   const glow = useGlassPointer()
//   <div className="surface glass-glow" {...glow}>…</div>
export function useGlassPointer() {
  const onPointerMove = useCallback((e) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }, [])

  // Recenter on leave so the next hover fades in from the middle, not a stale spot.
  const onPointerLeave = useCallback((e) => {
    const el = e.currentTarget
    el.style.setProperty('--mx', '50%')
    el.style.setProperty('--my', '50%')
  }, [])

  return { onPointerMove, onPointerLeave }
}
