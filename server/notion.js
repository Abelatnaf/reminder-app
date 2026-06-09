import { Client } from '@notionhq/client'
import { config, isNotionConfigured, persistDatabaseId } from './config.js'

let notion = null
function client() {
  if (!notion) notion = new Client({ auth: config.notionToken })
  return notion
}

const DB_TITLE = 'Reminders'
const DISMISSAL_PROP = 'Dismissal Events'
const CHECKLIST_PROP = 'Checklist'

const RECURRENCE_LABELS = { none: 'None', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom' }
const PRIORITY_LABELS   = { low: 'Low', medium: 'Medium', high: 'High' }
const CATEGORY_LABELS   = { work: 'Work', personal: 'Personal', health: 'Health', finance: 'Finance', other: 'Other' }
const RECURRENCE_VALUES = ['none', 'daily', 'weekly', 'monthly', 'custom']
const PRIORITY_VALUES   = ['low', 'medium', 'high']
const CATEGORY_VALUES   = ['work', 'personal', 'health', 'finance', 'other']
const ENGINE_KEYS = ['dismissalEvents', 'rescheduledByEngine', 'rescheduleDate', 'hiddenUntil']
const fromLabel = (label, fallback) => (label ? String(label).toLowerCase() : fallback)

const SCHEMA = {
  Title: { title: {} },
  Due: { date: {} },
  Recurrence: {
    select: { options: [
      { name: 'None', color: 'default' }, { name: 'Daily', color: 'blue' },
      { name: 'Weekly', color: 'green' }, { name: 'Monthly', color: 'purple' }, { name: 'Custom', color: 'orange' },
    ]},
  },
  'Recurrence Detail': { rich_text: {} },
  Priority: {
    select: { options: [
      { name: 'Low', color: 'gray' }, { name: 'Medium', color: 'yellow' }, { name: 'High', color: 'red' },
    ]},
  },
  Category: {
    select: { options: [
      { name: 'Work', color: 'blue' }, { name: 'Personal', color: 'purple' },
      { name: 'Health', color: 'green' }, { name: 'Finance', color: 'yellow' }, { name: 'Other', color: 'gray' },
    ]},
  },
  Done: { checkbox: {} },
  Notes: { rich_text: {} },
  Location: { rich_text: {} },
  'User ID': { rich_text: {} },
  [DISMISSAL_PROP]: { rich_text: {} },
  [CHECKLIST_PROP]: { rich_text: {} },
}

// Ensure the database exists; migrate existing DBs to add new properties.
export async function ensureDatabase() {
  if (!isNotionConfigured()) throw new Error('NOTION_TOKEN is not set')

  if (config.notionDatabaseId) {
    try {
      const db = await client().databases.retrieve({ database_id: config.notionDatabaseId })
      const missing = {}
      if (!db.properties?.[DISMISSAL_PROP]) missing[DISMISSAL_PROP] = { rich_text: {} }
      if (!db.properties?.[CHECKLIST_PROP]) missing[CHECKLIST_PROP] = { rich_text: {} }
      if (!db.properties?.['Category'])      missing['Category'] = SCHEMA['Category']
      if (!db.properties?.['Location'])      missing['Location'] = { rich_text: {} }
      if (!db.properties?.['User ID'])       missing['User ID']  = { rich_text: {} }
      if (Object.keys(missing).length) {
        await client().databases.update({ database_id: config.notionDatabaseId, properties: missing })
        console.log(`[notion] Added properties to existing database: ${Object.keys(missing).join(', ')}`)
      }
      return config.notionDatabaseId
    } catch (err) {
      console.warn('[notion] Saved database not reachable, will create a new one:', err.message)
    }
  }

  if (!config.notionParentPageId) {
    throw new Error(
      'No NOTION_DATABASE_ID and no NOTION_PARENT_PAGE_ID. Share a Notion page with your integration and set NOTION_PARENT_PAGE_ID so the app can create the database.'
    )
  }

  const created = await client().databases.create({
    parent: { type: 'page_id', page_id: config.notionParentPageId },
    title: [{ type: 'text', text: { content: DB_TITLE } }],
    properties: SCHEMA,
  })
  persistDatabaseId(created.id)
  console.log(`[notion] Created "${DB_TITLE}" database: ${created.id}`)
  return created.id
}

export function pageToReminder(page) {
  const p = page.properties || {}
  const title = (p.Title?.title || []).map((t) => t.plain_text).join('').trim()
  const recurrence = fromLabel(p.Recurrence?.select?.name, 'none')
  const priority   = fromLabel(p.Priority?.select?.name, 'medium')
  const category   = fromLabel(p.Category?.select?.name, null)

  let engineData = {}
  try {
    const raw = (p[DISMISSAL_PROP]?.rich_text || []).map((t) => t.plain_text).join('')
    engineData = raw ? JSON.parse(raw) : {}
  } catch { engineData = {} }

  return {
    id: page.id,
    title: title || 'Untitled reminder',
    datetime: p.Due?.date?.start || null,
    recurrence: RECURRENCE_VALUES.includes(recurrence) ? recurrence : 'none',
    recurrenceDetail: (p['Recurrence Detail']?.rich_text || []).map((t) => t.plain_text).join(''),
    priority:  PRIORITY_VALUES.includes(priority)  ? priority  : 'medium',
    category:  CATEGORY_VALUES.includes(category)  ? category  : null,
    done: Boolean(p.Done?.checkbox),
    notes:    (p.Notes?.rich_text    || []).map((t) => t.plain_text).join(''),
    location: (p.Location?.rich_text || []).map((t) => t.plain_text).join(''),
    userId:   (p['User ID']?.rich_text || []).map((t) => t.plain_text).join('') || null,
    createdAt: page.created_time || new Date().toISOString(),
    dismissalEvents:      Array.isArray(engineData.events) ? engineData.events : [],
    rescheduledByEngine:  Boolean(engineData.rescheduled_by_engine),
    rescheduleDate:       engineData.reschedule_date || null,
    hiddenUntil:          engineData.hidden_until    || null,
    checklist:            (() => {
      try {
        const raw = (p[CHECKLIST_PROP]?.rich_text || []).map((t) => t.plain_text).join('')
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    })(),
  }
}

function reminderToProperties(fields) {
  const props = {}
  if (fields.title    !== undefined) props.Title    = { title: [{ type: 'text', text: { content: fields.title || '' } }] }
  if (fields.datetime !== undefined) props.Due      = { date: fields.datetime ? { start: fields.datetime } : null }
  if (fields.recurrence       !== undefined) props.Recurrence        = { select: { name: RECURRENCE_LABELS[fields.recurrence] || 'None' } }
  if (fields.recurrenceDetail !== undefined) props['Recurrence Detail'] = { rich_text: textToRich(fields.recurrenceDetail) }
  if (fields.priority  !== undefined) props.Priority = { select: { name: PRIORITY_LABELS[fields.priority] || 'Medium' } }
  if (fields.category  !== undefined) props.Category = fields.category ? { select: { name: CATEGORY_LABELS[fields.category] || 'Other' } } : { select: null }
  if (fields.done     !== undefined) props.Done     = { checkbox: Boolean(fields.done) }
  if (fields.notes    !== undefined) props.Notes    = { rich_text: textToRich(fields.notes) }
  if (fields.location !== undefined) props.Location = { rich_text: textToRich(fields.location) }
  if (fields.userId   !== undefined) props['User ID'] = { rich_text: textToRich(fields.userId || '') }

  if (fields.checklist !== undefined) {
    props[CHECKLIST_PROP] = { rich_text: textToRich(JSON.stringify(fields.checklist || [])) }
  }

  if (ENGINE_KEYS.some((k) => k in fields)) {
    props[DISMISSAL_PROP] = { rich_text: textToRich(JSON.stringify({
      events:                fields.dismissalEvents    || [],
      rescheduled_by_engine: Boolean(fields.rescheduledByEngine),
      reschedule_date:       fields.rescheduleDate     || null,
      hidden_until:          fields.hiddenUntil        || null,
    })) }
  }
  return props
}

function textToRich(text) {
  const content = String(text || '')
  if (!content) return []
  return (content.match(/[\s\S]{1,1900}/g) || []).map((c) => ({ type: 'text', text: { content: c } }))
}

export async function listFromNotion(databaseId) {
  const results = []
  let cursor
  do {
    const res = await client().databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 })
    results.push(...res.results.map(pageToReminder))
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return results
}

export async function createInNotion(databaseId, fields, userId) {
  const page = await client().pages.create({
    parent: { database_id: databaseId },
    properties: reminderToProperties({ ...fields, userId }),
  })
  return pageToReminder(page)
}

export async function updateInNotion(id, fields) {
  const page = await client().pages.update({ page_id: id, properties: reminderToProperties(fields) })
  return pageToReminder(page)
}

export async function deleteInNotion(id) {
  await client().pages.update({ page_id: id, archived: true })
}
