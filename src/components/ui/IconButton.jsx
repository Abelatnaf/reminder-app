import { cn } from '../../lib/cn.js'

const SIZES = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' }

// Square, icon-only button. Pass an accessible `label` (becomes aria-label + title).
export function IconButton({ label, size = 'md', active = false, className, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors ring-focus',
        active
          ? 'bg-brand-600 text-white hover:bg-brand-500'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
