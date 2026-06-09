import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')
const RUNTIME_FILE = path.join(__dirname, '.runtime.json')

// Always load .env from the project root (not process.cwd()) so the server
// picks up keys even when started from another folder or an old terminal.
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') })

// We persist the auto-created Notion database id here so we only provision once.
function readRuntime() {
  try {
    return JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'))
  } catch {
    return {}
  }
}

export const runtime = readRuntime()

// Notion accepts ids with or without dashes. This accepts a raw id, a dashed
// UUID, or a full Notion URL and returns a normalized dashed UUID.
export function normalizeId(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const dashed = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)
  if (dashed) return dashed[0].toLowerCase()
  const runs = raw.match(/[0-9a-fA-F]{32}/g)
  const id = runs ? runs[runs.length - 1].toLowerCase() : raw
  if (/^[0-9a-fA-F]{32}$/.test(id)) {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
  }
  return id
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  appUrl: (process.env.APP_URL || '').trim() || `http://localhost:${Number(process.env.PORT) || 3001}`,
  // --- Groq (OpenAI-compatible) ---
  groqApiKey: (process.env.GROQ_API_KEY || '').trim(),
  groqModel: (process.env.GROQ_MODEL || '').trim() || 'llama-3.3-70b-versatile',
  groqBaseUrl: (process.env.GROQ_BASE_URL || '').trim() || 'https://api.groq.com/openai/v1',
  // --- Notion ---
  notionToken: (process.env.NOTION_TOKEN || '').trim(),
  notionParentPageId: normalizeId(process.env.NOTION_PARENT_PAGE_ID),
  notionDatabaseId: normalizeId(process.env.NOTION_DATABASE_ID) || runtime.databaseId || '',
}

export const isAiConfigured = () => Boolean(config.groqApiKey)
export const isNotionConfigured = () => Boolean(config.notionToken)

// Merge a patch into the persisted runtime file. Independent keys (the Notion
// database id, the auto-generated VAPID keypair) must not clobber each other,
// so every write merges rather than overwrites.
export function persistRuntime(patch) {
  Object.assign(runtime, patch)
  try {
    fs.writeFileSync(RUNTIME_FILE, JSON.stringify(runtime, null, 2))
  } catch (err) {
    console.warn('[config] Could not persist runtime:', err.message)
  }
}

// Save the database id the app created so subsequent runs reuse it.
export function persistDatabaseId(databaseId) {
  config.notionDatabaseId = databaseId
  persistRuntime({ databaseId })
}
