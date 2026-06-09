import { CalendarCheck2, Inbox, SearchX } from 'lucide-react'

// Friendly empty state. `variant` switches the copy between a fresh app,
// a filtered-to-nothing list, and an all-caught-up state.
export function EmptyState({ variant = 'empty' }) {
  const config = {
    empty: {
      icon: Inbox,
      title: 'No reminders yet',
      body: 'Type something like “Call mom on Sunday at 5pm” above and let the AI sort out the details.',
    },
    search: {
      icon: SearchX,
      title: 'Nothing matches',
      body: 'No reminders match your search or filter. Try clearing them.',
    },
    done: {
      icon: CalendarCheck2,
      title: 'All caught up',
      body: 'Nothing active right now. Enjoy the breathing room.',
    },
  }[variant]

  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600/10 text-brand-600 dark:text-brand-300">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-800 dark:text-zinc-100">{config.title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">{config.body}</p>
    </div>
  )
}
