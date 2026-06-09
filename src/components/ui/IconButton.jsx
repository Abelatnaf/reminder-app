import { cn } from '../../lib/cn.js'

const SIZES = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' }

export function IconButton({ label, size = 'md', active = false, className, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      style={active ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-150 ring-focus',
        active
          ? 'text-white shadow-sm shadow-brand-600/30'
          : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white',
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
