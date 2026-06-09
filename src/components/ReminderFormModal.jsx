import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Sparkles, Pencil, CalendarClock, Repeat, Flag, AlignLeft, Tag, MapPin, ListChecks, Plus, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Button } from './ui/Button.jsx'
import { DateTimePicker } from './ui/DateTimePicker.jsx'
import { cn } from '../lib/cn.js'
import { PRIORITY, CATEGORIES } from '../lib/format.js'

const RECURRENCES = [
  { value: 'none',    label: 'Once'    },
  { value: 'daily',   label: 'Daily'   },
  { value: 'weekly',  label: 'Weekly'  },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom',  label: 'Custom'  },
]

// Nth-weekday-of-month presets for the custom builder
const NTH = [
  { label: '1st', n: 'FIRST' }, { label: '2nd', n: 'SECOND' },
  { label: '3rd', n: 'THIRD' }, { label: '4th', n: 'FOURTH' }, { label: 'Last', n: 'LAST' },
]
const WDAYS = [
  { label: 'Sun', v: 'SU' }, { label: 'Mon', v: 'MO' }, { label: 'Tue', v: 'TU' },
  { label: 'Wed', v: 'WE' }, { label: 'Thu', v: 'TH' }, { label: 'Fri', v: 'FR' }, { label: 'Sat', v: 'SA' },
]
const WDAY_MULTI = [
  { label: 'Mon', v: 'MO' }, { label: 'Tue', v: 'TU' }, { label: 'Wed', v: 'WE' },
  { label: 'Thu', v: 'TH' }, { label: 'Fri', v: 'FR' }, { label: 'Sat', v: 'SA' }, { label: 'Sun', v: 'SU' },
]

const PRIORITIES = ['low', 'medium', 'high']
const CATEGORY_LIST = Object.entries(CATEGORIES)

const EMPTY = { title: '', datetime: null, recurrence: 'none', recurrenceDetail: '', priority: 'medium', notes: '', category: null, location: '', checklist: [] }

function fmtDt(iso) {
  if (!iso) return null
  try { return format(new Date(iso), 'EEE, MMM d · h:mm a') } catch { return null }
}

function newStep() {
  return { id: crypto.randomUUID(), text: '', done: false }
}

function preset(kind) {
  const d = new Date(); d.setSeconds(0, 0)
  if (kind === 'today')    { d.setHours(18, 0) }
  if (kind === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0) }
  if (kind === 'nextweek') { d.setDate(d.getDate() + 7); d.setHours(9, 0) }
  return d.toISOString()
}

// Parse a custom recurrenceDetail back into the builder state
function parseDetail(detail = '') {
  const t = detail.toUpperCase()
  // MONTHLY:FIRST;WEEKDAY:MO
  const mMatch = t.match(/MONTHLY:(\w+);WEEKDAY:(\w+)/)
  if (mMatch) return { mode: 'nth', nth: mMatch[1], weekday: mMatch[2] }
  // WEEKLY:MO,TU,WE or DAYS:MO,WE
  const wMatch = t.match(/(?:WEEKLY:|DAYS:)([A-Z,]+)/)
  if (wMatch) return { mode: 'days', days: wMatch[1].split(',').map(d => d.trim()) }
  // INTERVAL:2;UNIT:week
  const iMatch = t.match(/INTERVAL:(\d+);UNIT:(DAY|WEEK|MONTH)/)
  if (iMatch) return { mode: 'interval', interval: iMatch[1], unit: iMatch[2].toLowerCase() }
  return { mode: 'raw', raw: detail }
}

function buildDetail(builder) {
  if (builder.mode === 'nth') return `MONTHLY:${builder.nth};WEEKDAY:${builder.weekday}`
  if (builder.mode === 'days') return `WEEKLY:${(builder.days || []).join(',')}`
  if (builder.mode === 'interval') return `INTERVAL:${builder.interval};UNIT:${(builder.unit || 'week').toUpperCase()}`
  return builder.raw || ''
}

export function ReminderFormModal({ open, onOpenChange, mode = 'create', initial, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [builder, setBuilder] = useState({ mode: 'raw', raw: '' })
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (open) {
      const f = { ...EMPTY, ...(initial || {}) }
      setForm(f)
      setSaving(false)
      setPickerOpen(false)
      setBuilder(f.recurrence === 'custom' ? parseDetail(f.recurrenceDetail) : { mode: 'raw', raw: '' })
    }
  }, [open, initial])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setB = (patch) => setBuilder((b) => {
    const next = { ...b, ...patch }
    set({ recurrenceDetail: buildDetail(next) })
    return next
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        title:           form.title.trim(),
        datetime:        form.datetime || null,
        recurrence:      form.recurrence,
        recurrenceDetail: form.recurrence === 'custom' ? form.recurrenceDetail : '',
        priority:        form.priority,
        notes:           form.notes,
        category:        form.category || null,
        location:        form.location || '',
        checklist:       (form.checklist || []).filter((s) => s.text.trim()),
      })
      onOpenChange(false)
    } catch { setSaving(false) }
  }

  const isEdit = mode === 'edit'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm data-[state=open]:animate-overlayShow" />
        <Dialog.Content
          className="surface-modal fixed left-1/2 top-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 data-[state=open]:animate-contentShow focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600/10 text-brand-600 dark:text-brand-300">
                {isEdit ? <Pencil className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </span>
              <div>
                <Dialog.Title className="text-base font-semibold leading-tight">
                  {isEdit ? 'Edit reminder' : 'Review & save'}
                </Dialog.Title>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isEdit ? 'Update any detail below.' : 'Tweak anything the AI got wrong, then save.'}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 ring-focus dark:hover:bg-zinc-800" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Title</label>
              <input autoFocus value={form.title} onChange={(e) => set({ title: e.target.value })}
                placeholder="What do you need to remember?"
                className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Tag className="h-3.5 w-3.5" /> Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => set({ category: null })}
                  style={form.category === null ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-focus',
                    form.category === null
                      ? 'glass-sheen text-white shadow-sm shadow-brand-600/30'
                      : 'glass-pill text-zinc-600 dark:text-zinc-300'
                  )}>None</button>
                {CATEGORY_LIST.map(([key, cat]) => (
                  <button key={key} type="button" onClick={() => set({ category: key })}
                    className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-focus',
                      form.category === key ? cat.chip + ' ring-1' : 'glass-pill text-zinc-600 dark:text-zinc-300'
                    )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', cat.dot)} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & time */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <CalendarClock className="h-3.5 w-3.5" /> When
              </label>

              {/* If date is set — show a clean date+time card */}
              {form.datetime ? (
                <div
                  className={cn(
                    'flex items-center gap-4 rounded-2xl px-4 py-3 cursor-pointer transition-all',
                    pickerOpen
                      ? 'border border-brand-400/50 bg-brand-50/40 dark:bg-brand-500/10'
                      : 'glass-pill'
                  )}
                  onClick={() => setPickerOpen((o) => !o)}
                >
                  {/* Date section */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-600/10 dark:bg-brand-500/15">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400 leading-none">
                        {format(new Date(form.datetime), 'MMM')}
                      </span>
                      <span className="text-lg font-black leading-tight text-brand-700 dark:text-brand-300">
                        {format(new Date(form.datetime), 'd')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {format(new Date(form.datetime), 'EEEE')}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {format(new Date(form.datetime), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-zinc-200/80 dark:bg-white/10 shrink-0" />

                  {/* Time section */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                      {format(new Date(form.datetime), 'h:mm a')}
                    </span>
                  </div>

                  {/* Clear */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); set({ datetime: null }); setPickerOpen(false) }}
                    className="shrink-0 grid h-6 w-6 place-items-center rounded-full text-zinc-400 hover:bg-zinc-200/80 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-300 transition-colors"
                    aria-label="Clear date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* If no date — show 3 quick-picks + custom button */
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['today',    'Today',     '6:00 PM'],
                    ['tomorrow', 'Tomorrow',  '9:00 AM'],
                    ['nextweek', 'Next week', '9:00 AM'],
                  ].map(([kind, day, time]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => { set({ datetime: preset(kind) }); setPickerOpen(true) }}
                      className="glass-pill flex flex-col items-start gap-0.5 rounded-2xl px-3.5 py-2.5 text-left transition-all"
                    >
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{day}</span>
                      <span className="text-[11px] text-zinc-400">{time}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerOpen((o) => !o)}
                    className="flex flex-col items-start gap-0.5 rounded-2xl border border-dashed border-zinc-300/80 bg-transparent px-3.5 py-2.5 text-left transition-all hover:border-brand-400/50 hover:bg-brand-50/30 dark:border-white/12 dark:hover:border-brand-700/50"
                  >
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Custom</span>
                    <span className="text-[11px] text-zinc-400">Pick date & time</span>
                  </button>
                </div>
              )}

              {/* Inline picker */}
              <AnimatePresence initial={false}>
                {pickerOpen && (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="mt-3 overflow-hidden"
                  >
                    <DateTimePicker
                      value={form.datetime}
                      onChange={(v) => set({ datetime: v })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recurrence */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Repeat className="h-3.5 w-3.5" /> Repeat
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCES.map((r) => (
                  <button key={r.value} type="button" onClick={() => set({ recurrence: r.value })}
                    style={form.recurrence === r.value ? { background: 'linear-gradient(135deg, #c01a10 0%, #e62216 40%, #ff4b3a 100%)' } : undefined}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-focus',
                      form.recurrence === r.value ? 'glass-sheen text-white shadow-sm shadow-brand-600/30' : 'glass-pill text-zinc-600 dark:text-zinc-300'
                    )}>
                    {r.label}
                  </button>
                ))}
              </div>

              {form.recurrence === 'custom' && (
                <div className="mt-3 space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-700 p-3">
                  {/* Builder mode tabs */}
                  <div className="flex gap-1.5">
                    {[['nth','Nth weekday'],['days','Specific days'],['interval','Interval'],['raw','Manual']].map(([m, lbl]) => (
                      <button key={m} type="button" onClick={() => setB({ mode: m })}
                        className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                          builder.mode === m ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                        )}>
                        {lbl}
                      </button>
                    ))}
                  </div>

                  {builder.mode === 'nth' && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">e.g. "1st Monday of each month"</p>
                      <div className="flex flex-wrap gap-1">
                        {NTH.map(({ label, n }) => (
                          <button key={n} type="button" onClick={() => setB({ nth: n })}
                            className={cn('rounded px-2 py-1 text-xs font-medium', builder.nth === n ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300')}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {WDAYS.map(({ label, v }) => (
                          <button key={v} type="button" onClick={() => setB({ weekday: v })}
                            className={cn('rounded px-2 py-1 text-xs font-medium', builder.weekday === v ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300')}>
                            {label}
                          </button>
                        ))}
                      </div>
                      {builder.nth && builder.weekday && (
                        <p className="text-xs text-zinc-400">→ {builder.nth.charAt(0) + builder.nth.slice(1).toLowerCase()} {WDAYS.find(d => d.v === builder.weekday)?.label} of each month</p>
                      )}
                    </div>
                  )}

                  {builder.mode === 'days' && (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">Select days of the week</p>
                      <div className="flex flex-wrap gap-1">
                        {WDAY_MULTI.map(({ label, v }) => {
                          const active = (builder.days || []).includes(v)
                          return (
                            <button key={v} type="button" onClick={() => {
                              const days = builder.days || []
                              setB({ days: active ? days.filter(d => d !== v) : [...days, v] })
                            }}
                              className={cn('rounded px-2 py-1 text-xs font-medium', active ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300')}>
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {builder.mode === 'interval' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Every</span>
                      <input type="number" min="1" max="99" value={builder.interval || 2}
                        onChange={(e) => setB({ interval: e.target.value })}
                        className="w-14 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      {['day','week','month'].map(u => (
                        <button key={u} type="button" onClick={() => setB({ unit: u })}
                          className={cn('rounded px-2 py-1 text-xs font-medium capitalize', builder.unit === u ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300')}>
                          {u}s
                        </button>
                      ))}
                    </div>
                  )}

                  {builder.mode === 'raw' && (
                    <input value={form.recurrenceDetail} onChange={(e) => set({ recurrenceDetail: e.target.value })}
                      placeholder='e.g. WEEKLY:TU,TH or INTERVAL:2;UNIT:WEEK'
                      className="glass-input w-full rounded-xl px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100"
                    />
                  )}

                  {form.recurrenceDetail && (
                    <p className="font-mono text-[10px] text-zinc-400">rule: {form.recurrenceDetail}</p>
                  )}
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Flag className="h-3.5 w-3.5" /> Priority
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRIORITIES.map((p) => (
                  <button key={p} type="button" onClick={() => set({ priority: p })}
                    className={cn('flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ring-focus',
                      form.priority === p ? PRIORITY[p].chip + ' ring-1' : 'glass-pill text-zinc-500 dark:text-zinc-400'
                    )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY[p].dot)} />
                    {PRIORITY[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <MapPin className="h-3.5 w-3.5" /> Location <span className="text-zinc-400">(optional)</span>
              </label>
              <input value={form.location} onChange={(e) => set({ location: e.target.value })}
                placeholder="Address or place name…"
                className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <AlignLeft className="h-3.5 w-3.5" /> Notes <span className="text-zinc-400">(optional — paste meeting links here)</span>
              </label>
              <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2}
                placeholder="Anything else… Zoom/Meet/Teams links auto-detect a Join button."
                className="glass-input w-full resize-none rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>

            {/* Checklist */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <ListChecks className="h-3.5 w-3.5" /> Checklist <span className="text-zinc-400">(optional)</span>
              </label>
              <div className="space-y-1.5">
                {(form.checklist || []).map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-right text-xs text-zinc-400">{idx + 1}.</span>
                    <input
                      value={step.text}
                      onChange={(e) => set({ checklist: form.checklist.map((s) => s.id === step.id ? { ...s, text: e.target.value } : s) })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          set({ checklist: [...form.checklist, newStep()] })
                        }
                      }}
                      placeholder={`Step ${idx + 1}`}
                      className="glass-input flex-1 rounded-lg px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => set({ checklist: form.checklist.filter((s) => s.id !== step.id) })}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                      aria-label="Remove step"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => set({ checklist: [...(form.checklist || []), newStep()] })}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Add step
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild><Button type="button" variant="ghost">Cancel</Button></Dialog.Close>
              <Button type="submit" disabled={saving || !form.title.trim()}>
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save reminder'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
