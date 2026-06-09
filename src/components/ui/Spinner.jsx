import { cn } from '../../lib/cn.js'

// Lightweight loading spinner.
export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        className || 'h-4 w-4'
      )}
    />
  )
}
