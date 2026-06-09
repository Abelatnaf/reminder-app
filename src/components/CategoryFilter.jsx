import { CATEGORIES } from '../lib/format.js'
import { cn } from '../lib/cn.js'

const ALL = Object.entries(CATEGORIES)

export function CategoryFilter({ active, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => onChange(null)}
        style={active === null ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-all ring-focus',
          active === null
            ? 'glass-sheen text-white shadow-sm shadow-brand-600/30'
            : 'glass-pill text-zinc-600 dark:text-zinc-300'
        )}
      >
        All
      </button>
      {ALL.map(([key, cat]) => (
        <button
          key={key}
          onClick={() => onChange(active === key ? null : key)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ring-focus',
            active === key ? cat.chip + ' ring-1' : 'glass-pill text-zinc-600 dark:text-zinc-300'
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', cat.dot)} />
          {cat.label}
        </button>
      ))}
    </div>
  )
}
