import { CATEGORIES } from '../lib/format.js'
import { cn } from '../lib/cn.js'

const ALL = Object.entries(CATEGORIES)

export function CategoryFilter({ active, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors ring-focus',
          active === null
            ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20'
        )}
      >
        All
      </button>
      {ALL.map(([key, cat]) => (
        <button
          key={key}
          onClick={() => onChange(active === key ? null : key)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ring-focus',
            active === key ? cat.chip + ' ring-1' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20'
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', cat.dot)} />
          {cat.label}
        </button>
      ))}
    </div>
  )
}
