import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Sparkles, Pencil, CalendarClock, Repeat, Flag, AlignLeft, Tag, MapPin } from 'lucide-react'
import { Button } from './ui/Button.jsx'
import { cn } from '../lib/cn.js'
import { toLocalInput, fromLocalInput, PRIORITY, CATEGORIES } from '../lib/format.js'

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

const EMPTY = { title: '', datetime: null, recurrence: 'none', recurrenceDetail: '', priority: 'medium', notes: '', category: null, location: '' }

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

  useEffect(() => {
    if (open) {
      const f = { ...EMPTY, ...(initial || {}) }
      setForm(f)
      setSaving(false)
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
          className="surface fixed left-1/2 top-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl shadow-zinc-950/20 data-[state=open]:animate-contentShow focus:outline-none"
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
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 ring-focus dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Tag className="h-3.5 w-3.5" /> Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => set({ category: null })}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ring-focus',
                    form.category === null
                      ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  )}>None</button>
                {CATEGORY_LIST.map(([key, cat]) => (
                  <button key={key} type="button" onClick={() => set({ category: key })}
                    className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ring-focus',
                      form.category === key ? cat.chip + ' ring-1' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', cat.dot)} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & time */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <CalendarClock className="h-3.5 w-3.5" /> When
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input type="datetime-local" value={toLocalInput(form.datetime)} onChange={(e) => set({ datetime: fromLocalInput(e.target.value) })}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 ring-focus dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
                />
                {form.datetime && <button type="button" onClick={() => set({ datetime: null })} className="text-xs text-zinc-500 underline-offset-2 hover:underline">Clear</button>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[['today','Today 6pm'],['tomorrow','Tomorrow 9am'],['nextweek','Next week']].map(([kind, label]) => (
                  <button key={kind} type="button" onClick={() => set({ datetime: preset(kind) })}
                    className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Repeat className="h-3.5 w-3.5" /> Repeat
              </label>
              <div className="flex flex-wrap gap-1.5">
                {RECURRENCES.map((r) => (
                  <button key={r.value} type="button" onClick={() => set({ recurrence: r.value })}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ring-focus',
                      form.recurrence === r.value ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
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
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 ring-focus dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
                    className={cn('flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ring-focus',
                      form.priority === p ? 'border-transparent ' + PRIORITY[p].chip : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
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
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 ring-focus dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <AlignLeft className="h-3.5 w-3.5" /> Notes <span className="text-zinc-400">(optional — paste meeting links here)</span>
              </label>
              <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2}
                placeholder="Anything else… Zoom/Meet/Teams links auto-detect a Join button."
                className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 ring-focus dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
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
