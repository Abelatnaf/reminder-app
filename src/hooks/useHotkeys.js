import { useEffect, useState } from 'react'

// Global keyboard shortcuts. Handlers are optional; missing ones are ignored.
// Shortcuts are suppressed while typing in inputs (except Escape).
export function useHotkeys(handlers) {
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    let lastG = 0

    function onKey(e) {
      const target = e.target
      const tag = (target?.tagName || '').toLowerCase()
      const typing = tag === 'input' || tag === 'textarea' || target?.isContentEditable

      if (e.key === 'Escape') {
        if (helpOpen) setHelpOpen(false)
        handlers.escape?.()
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case '/':
        case 'n':
        case 'N':
          e.preventDefault()
          handlers.focusInput?.()
          break
        case '?':
          e.preventDefault()
          setHelpOpen((v) => !v)
          break
        case 'g':
        case 'G':
          lastG = Date.now()
          break
        case 'l':
        case 'L':
          if (Date.now() - lastG < 700) handlers.viewList?.()
          break
        case 'c':
        case 'C':
          if (Date.now() - lastG < 700) handlers.viewCalendar?.()
          break
        case 'j':
        case 'ArrowDown':
          if (handlers.moveSelection) {
            e.preventDefault()
            handlers.moveSelection(1)
          }
          break
        case 'k':
        case 'ArrowUp':
          if (handlers.moveSelection) {
            e.preventDefault()
            handlers.moveSelection(-1)
          }
          break
        case 'x':
        case 'X':
        case 'Enter':
          handlers.toggleSelected?.()
          break
        case 'e':
        case 'E':
          handlers.editSelected?.()
          break
        case 'Backspace':
        case 'Delete':
          handlers.deleteSelected?.()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers, helpOpen])

  return { helpOpen, setHelpOpen }
}

// The list shown in the "?" help overlay.
export const SHORTCUTS = [
  { keys: ['/', 'n'], label: 'Focus the quick-add bar' },
  { keys: ['j', 'k'], label: 'Move selection down / up' },
  { keys: ['x'], label: 'Complete / uncomplete selected' },
  { keys: ['e'], label: 'Edit selected' },
  { keys: ['del'], label: 'Delete selected' },
  { keys: ['g', 'l'], label: 'Go to list view' },
  { keys: ['g', 'c'], label: 'Go to calendar view' },
  { keys: ['?'], label: 'Show this help' },
  { keys: ['esc'], label: 'Close panels / dialogs' },
]
