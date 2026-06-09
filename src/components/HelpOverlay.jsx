import * as Dialog from '@radix-ui/react-dialog'
import { X, Keyboard } from 'lucide-react'
import { SHORTCUTS } from '../hooks/useHotkeys.js'

function Key({ children }) {
  return (
    <kbd className="glass-pill inline-grid min-w-6 place-items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
      {children}
    </kbd>
  )
}

// Keyboard shortcuts cheat-sheet (opened with "?").
export function HelpOverlay({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="surface-modal fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 data-[state=open]:animate-contentShow focus:outline-none" aria-describedby={undefined}>
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
              <Keyboard className="h-5 w-5 text-brand-500" /> Keyboard shortcuts
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <ul className="space-y-1.5">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <span className="text-zinc-600 dark:text-zinc-300">{s.label}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k, i) => (
                    <Key key={i}>{k}</Key>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
