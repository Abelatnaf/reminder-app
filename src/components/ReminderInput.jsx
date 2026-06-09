import { forwardRef, useState } from 'react'
import { Sparkles, CornerDownLeft, Plus, PencilLine, Terminal } from 'lucide-react'
import { Spinner } from './ui/Spinner.jsx'
import { cn } from '../lib/cn.js'

const CREATE_EXAMPLES = [
  'Call John every Tuesday at 9am',
  'Pay rent on the 1st',
  'Dentist next Thursday 2:30pm',
  'Water the plants every 3 days',
]

const COMMAND_EXAMPLES = [
  'Move all work reminders to next Monday',
  'Mark health tasks done',
  'Delete all finance reminders',
]

export const ReminderInput = forwardRef(function ReminderInput(
  { onParse, onManual, onCommand, parsing, aiEnabled },
  ref
) {
  const [text, setText] = useState('')
  const [commandMode, setCommandMode] = useState(false)
  const [focused, setFocused] = useState(false)

  function submit(e, { review = false } = {}) {
    e?.preventDefault()
    const value = text.trim()
    if (!value || parsing) return
    if (commandMode && onCommand) {
      onCommand(value, { onDone: () => setText('') })
    } else {
      onParse(value, { review, onDone: () => setText('') })
    }
  }

  const examples = commandMode ? COMMAND_EXAMPLES : CREATE_EXAMPLES

  return (
    <div>
      <form onSubmit={(e) => submit(e, { review: false })}>
        <div
          className={cn(
            'surface flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200',
            focused && !commandMode && 'ring-2 ring-brand-500/35 shadow-lg shadow-brand-500/10',
            focused && commandMode && 'ring-2 ring-violet-500/35 shadow-lg shadow-violet-500/10',
            !focused && 'hover:shadow-md',
          )}
        >
          {commandMode
            ? <Terminal className="h-5 w-5 shrink-0 text-violet-500" />
            : <Sparkles className="h-5 w-5 shrink-0 text-brand-500" />
          }

          <input
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              commandMode
                ? 'Ask AI to modify reminders… e.g. "move work tasks to Monday"'
                : aiEnabled ? 'Add a reminder in plain English…' : 'Add a reminder…'
            }
            aria-label={commandMode ? 'AI command' : 'Add a reminder'}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />

          {/* Review button */}
          {aiEnabled && !commandMode && (
            <button
              type="button"
              onClick={(e) => submit(e, { review: true })}
              disabled={!text.trim() || parsing}
              title="Parse & review before saving"
              aria-label="Parse and review before saving"
              className="hidden shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100/80 hover:text-zinc-700 disabled:opacity-40 sm:inline-flex dark:hover:bg-white/10 ring-focus"
            >
              <PencilLine className="h-5 w-5" />
            </button>
          )}

          {/* Manual add */}
          {!commandMode && (
            <button
              type="button"
              onClick={onManual}
              title="Add manually"
              aria-label="Add manually"
              className="hidden shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100/80 hover:text-zinc-700 sm:inline-flex dark:hover:bg-white/10 ring-focus"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          {/* Command mode toggle */}
          {aiEnabled && (
            <button
              type="button"
              onClick={() => { setCommandMode((m) => !m); setText('') }}
              title={commandMode ? 'Switch to add mode' : 'Switch to AI command mode'}
              aria-label={commandMode ? 'Switch to add mode' : 'Switch to AI command mode'}
              className={cn(
                'hidden shrink-0 rounded-lg p-1.5 transition-all sm:inline-flex ring-focus',
                commandMode
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-100/80 hover:text-zinc-700 dark:hover:bg-white/10'
              )}
            >
              <Terminal className="h-5 w-5" />
            </button>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!text.trim() || parsing}
            style={text.trim() && !parsing
              ? commandMode
                ? { background: 'linear-gradient(135deg, #5b21b6, #7c3aed)' }
                : { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' }
              : undefined
            }
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 ring-focus',
              text.trim() && !parsing
                ? 'text-white shadow-md'
                : 'bg-zinc-100/80 text-zinc-400 dark:bg-white/8'
            )}
          >
            {parsing ? (
              <><Spinner className="h-4 w-4" />{commandMode ? 'Running…' : 'Adding…'}</>
            ) : (
              <>{commandMode ? 'Run' : 'Add'} <CornerDownLeft className="h-4 w-4" /></>
            )}
          </button>
        </div>
      </form>

      {/* Example prompts */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 px-1">
        <span className="text-[11px] font-medium text-zinc-400">Try:</span>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
              commandMode
                ? 'border-violet-200/80 bg-violet-50/60 text-violet-600 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-800/60 dark:bg-violet-900/15 dark:text-violet-400'
                : 'border-zinc-200/80 bg-white/60 text-zinc-500 hover:border-brand-300/60 hover:text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-brand-700/60 dark:hover:text-brand-300'
            )}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
})
