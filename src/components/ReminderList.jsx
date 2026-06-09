import { AnimatePresence } from 'framer-motion'
import { FilterBar } from './FilterBar.jsx'
import { ReminderCard } from './ReminderCard.jsx'
import { EmptyState } from './EmptyState.jsx'

function Skeleton() {
  return (
    <div className="surface flex items-center gap-3 rounded-2xl px-4 py-4">
      <div className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-white/10" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-white/5" />
      </div>
    </div>
  )
}

// List view: filter controls on top, animated list below.
export function ReminderList({ visible, loading, counts, filter, isFiltered, cardProps }) {
  return (
    <div className="space-y-4">
      <FilterBar {...filter} counts={counts} />

      {loading ? (
        <div className="space-y-2.5">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState variant={isFiltered ? 'search' : filter.status === 'done' ? 'done' : 'empty'} />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((r) => (
              <ReminderCard key={r.id} {...cardProps(r)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
