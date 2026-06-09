import { forwardRef, useState } from 'react'
import { Sparkles, CornerDownLeft, Plus, PencilLine } from 'lucide-react'
import { Spinner } from './ui/Spinner.jsx'
import { cn } from '../lib/cn.js'

const EXAMPLES = [
  'Call John every Tuesday at 9am',
  'Pay rent on the 1st',
  'Dentist appointment next Thursday 2:30pm',
  'Water the plants every 3 days',
]

// The hero input. Pressing Enter (or "Add") parses with AI and saves in one shot
// — a Undo toast covers mistakes. The pencil button parses but opens the form to
// review first; the "+" opens a blank form for fully manual entry.
export const ReminderInput = forwardRef(function ReminderInput(
  { onParse, onManual, parsing, aiEnabled },
  ref
) {
  const [text, setText] = useState('')

  function submit(e, { review = false } = {}) {
    e?.preventDefault()
    const value = text.trim()
    if (!value || parsing) return
    onParse(value, { review, onDone: () => setText('') })
  }

  return (
    <div>
      <form onSubmit={(e) => submit(e, { review: false })} className="group relative">
        <div
          className={cn(
            'surface flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm transition-shadow',
            'focus-within:shadow-md focus-within:ring-2 focus-within:ring-brand-500/40'
          )}
        >
          <Sparkles className="h-5 w-5 shrink-0 text-brand-500" />
          <input
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={aiEnabled ? 'Add a reminder in plain English…' : 'Add a reminder…'}
            aria-label="Add a reminder"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />
          {aiEnabled && (
            <button
              type="button"
              onClick={(e) => submit(e, { review: true })}
              disabled={!text.trim() || parsing}
              title="Parse & review before saving"
              aria-label="Parse and review before saving"
              className="hidden shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 sm:inline-flex dark:hover:bg-zinc-800"
            >
              <PencilLine className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onManual}
            title="Add manually"
            aria-label="Add manually"
            className="hidden shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 sm:inline-flex dark:hover:bg-zinc-800"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!text.trim() || parsing}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ring-focus',
              text.trim() && !parsing
                ? 'bg-brand-600 text-white hover:bg-brand-500'
                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
            )}
          >
            {parsing ? (
              <>
                <Spinner className="h-4 w-4" /> Adding…
              </>
            ) : (
              <>
                Add <CornerDownLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Example prompts — click to prefill. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="rounded-full border border-zinc-200 bg-white/60 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:border-brand-700 dark:hover:text-brand-300"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
})
