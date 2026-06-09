import { cn } from '../../lib/cn.js'

const VARIANTS = {
  primary:
    'glass-sheen text-white shadow-md shadow-brand-600/30 hover:shadow-lg hover:shadow-brand-600/35 active:scale-[0.98] disabled:shadow-none disabled:opacity-60',
  subtle:
    'glass-pill text-zinc-800 dark:text-zinc-100',
  ghost:
    'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/8 dark:hover:text-white',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:bg-rose-700',
  outline:
    'glass-pill text-zinc-700 dark:text-zinc-200',
}

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  const isPrimary = variant === 'primary'
  return (
    <button
      style={isPrimary ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 ring-focus disabled:cursor-not-allowed select-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
