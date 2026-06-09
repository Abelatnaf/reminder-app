import { format } from 'date-fns'
import { cn } from '../lib/cn.js'

// Apple Calendar–style app tile (weekday + day). Used in the header; updates daily.
export function AppMark({ className }) {
  const now = new Date()
  const weekday = format(now, 'EEE').toUpperCase()
  const day = format(now, 'd')

  return (
    <div
      className={cn(
        'glass-pill relative flex h-10 w-10 shrink-0 flex-col overflow-hidden rounded-[12px] text-center',
        className
      )}
      aria-hidden
    >
      <div
        className="flex h-[13px] items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #c01a10 0%, #e62216 45%, #ff4b3a 100%)' }}
      >
        <span className="text-[7px] font-bold leading-none tracking-[0.14em] text-white">{weekday}</span>
      </div>
      <div className="flex flex-1 items-center justify-center pb-0.5">
        <span className="text-[17px] font-bold leading-none tracking-tight text-zinc-900 dark:text-zinc-50">{day}</span>
      </div>
    </div>
  )
}
