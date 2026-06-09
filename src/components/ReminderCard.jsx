import { motion } from 'framer-motion'
import { Check, Clock, Moon, Pencil, Trash2, Repeat, CalendarClock, Wand2, MapPin, Video } from 'lucide-react'
import { Badge } from './ui/Badge.jsx'
import { cn } from '../lib/cn.js'
import { formatDue, PRIORITY, RECURRENCE_LABEL, CATEGORIES } from '../lib/format.js'

const MEET_PATTERNS = [
  { re: /meet\.google\.com\/[a-z-]+/i,        label: 'Google Meet' },
  { re: /zoom\.us\/j\/\d+/i,                   label: 'Zoom' },
  { re: /teams\.microsoft\.com\/l\/meetup/i,   label: 'Teams' },
  { re: /whereby\.com\/[a-z0-9-]+/i,           label: 'Whereby' },
]

function detectMeetingUrl(text = '') {
  for (const { re, label } of MEET_PATTERNS) {
    const m = text.match(re)
    if (m) return { url: `https://${m[0]}`, label }
  }
  return null
}

export function ReminderCard({ reminder, selected, onSelect, onToggle, onSnooze, onLater, onEdit, onDelete, suggestion, onReschedule }) {
  const p   = PRIORITY[reminder.priority]   || PRIORITY.medium
  const cat = CATEGORIES[reminder.category] || null
  const due = formatDue(reminder.datetime)
  const recurrence  = RECURRENCE_LABEL[reminder.recurrence]
  const meetingLink = detectMeetingUrl(reminder.notes)

  const stripColor = cat ? cat.strip : (reminder.done ? 'bg-emerald-400' : p.strip)

  const ToolbarBtn = ({ label, onClick, danger, children }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label={label} title={label}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition-colors ring-focus',
        danger
          ? 'hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400'
          : 'hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-100'
      )}
    >
      {children}
    </button>
  )

  return (
    <motion.div
      layout
      data-rid={reminder.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 40 }}
      onMouseEnter={onSelect}
      className={cn(
        'surface group relative overflow-hidden rounded-2xl transition-shadow',
        selected ? 'ring-2 ring-brand-500/40 shadow-sm' : 'hover:shadow-sm',
        reminder.done && 'opacity-55'
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Color strip — category takes priority over priority color */}
        <span className={cn('absolute inset-y-0 left-0 w-1', stripColor)} />

        {/* Checkbox */}
        <button
          onClick={() => onToggle()}
          aria-label={reminder.done ? 'Mark as not done' : 'Mark as done'}
          aria-pressed={reminder.done}
          className={cn(
            'mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors ring-focus',
            reminder.done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-zinc-300 hover:border-brand-500 dark:border-zinc-600'
          )}
        >
          <motion.span initial={false} animate={{ scale: reminder.done ? 1 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 30 }}>
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </motion.span>
        </button>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <button onClick={onEdit} className="block max-w-full text-left">
            <p className={cn('truncate text-[15px] font-medium leading-snug', reminder.done && 'line-through decoration-zinc-400')}>
              {reminder.title}
            </p>
          </button>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {reminder.datetime && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                (due.tone === 'overdue' || due.tone === 'today') && !reminder.done ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500 dark:text-zinc-400'
              )}>
                <Clock className="h-3.5 w-3.5" />
                {due.label}
                {due.overdue && !reminder.done && <span className="font-semibold"> · Overdue</span>}
              </span>
            )}

            {cat && (
              <Badge className={cat.chip}>
                <span className={cn('h-1.5 w-1.5 rounded-full', cat.dot)} />
                {cat.label}
              </Badge>
            )}

            <Badge className={p.chip}>
              <span className={cn('h-1.5 w-1.5 rounded-full', p.dot)} />
              {p.label}
            </Badge>

            {recurrence && (
              <Badge className="bg-zinc-100 text-zinc-600 ring-zinc-600/10 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/10">
                <Repeat className="h-3 w-3" />
                {recurrence}
              </Badge>
            )}

            {reminder.location && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(reminder.location)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-600 dark:text-zinc-400 dark:hover:text-brand-400"
              >
                <MapPin className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{reminder.location}</span>
              </a>
            )}

            {meetingLink && (
              <a
                href={meetingLink.url}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700"
              >
                <Video className="h-3 w-3" />
                Join {meetingLink.label}
              </a>
            )}

            {reminder.notes && !meetingLink && (
              <span className="truncate text-xs text-zinc-400 dark:text-zinc-500" title={reminder.notes}>
                — {reminder.notes}
              </span>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className={cn('flex shrink-0 items-center gap-0.5 transition-opacity', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
          <ToolbarBtn label="Snooze 1 hour" onClick={onSnooze}><Clock className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn label="Later (hide until tomorrow)" onClick={onLater}><Moon className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn label="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></ToolbarBtn>
          <ToolbarBtn label="Delete" danger onClick={onDelete}><Trash2 className="h-4 w-4" /></ToolbarBtn>
        </div>
      </div>

      {/* Adaptive rescheduling nudge */}
      {suggestion && !reminder.done && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 border-t hairline bg-brand-50/60 px-4 py-2 dark:bg-brand-500/10"
        >
          <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
          <span className="flex-1 text-xs text-brand-900/90 dark:text-brand-100/90">
            {suggestion.source === 'self' ? 'You usually finish this' : 'You usually finish similar reminders'} around{' '}
            <strong>{suggestion.label}</strong>
            {suggestion.weekday ? `, ${suggestion.weekday.label}` : ''} — reschedule?
            <span className="mt-0.5 block text-[10px] text-brand-900/55 dark:text-brand-100/50">
              based on {suggestion.n} completion{suggestion.n === 1 ? '' : 's'} · {suggestion.source === 'self' ? 'this reminder' : 'same priority'}
            </span>
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onReschedule(suggestion) }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-500 ring-focus"
          >
            <CalendarClock className="h-3 w-3" />
            Reschedule
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
