import { Search, ArrowUpDown, X } from 'lucide-react'
import { cn } from '../lib/cn.js'

const SORTS = [
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Recently added' },
  { value: 'title', label: 'Title' },
]

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Done' },
]

// Search + status segmented control + sort selector for the list view.
export function FilterBar({ query, onQuery, status, onStatus, sort, onSort, counts }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search reminders…"
          className="w-full rounded-xl border border-zinc-200 bg-white/70 py-2 pl-9 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 ring-focus dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100"
        />
        {query && (
          <button onClick={() => onQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Status segmented control */}
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white/70 p-0.5 dark:border-zinc-800 dark:bg-zinc-900/60">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatus(s.value)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ring-focus',
                status === s.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
            >
              {s.label}
              {counts && counts[s.value] != null && (
                <span className={cn('ml-1 tabular-nums', status === s.value ? 'text-white/80' : 'text-zinc-400')}>
                  {counts[s.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative inline-flex items-center">
          <ArrowUpDown className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            aria-label="Sort reminders"
            className="appearance-none rounded-xl border border-zinc-200 bg-white/70 py-2 pl-8 pr-7 text-xs font-medium text-zinc-700 ring-focus dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
