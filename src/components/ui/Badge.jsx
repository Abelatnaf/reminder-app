import { cn } from '../../lib/cn.js'

// Small pill used for priority, recurrence, and status chips.
export function Badge({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
