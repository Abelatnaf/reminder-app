import './env.js'
import pg from 'pg'

const { Pool } = pg
let pool = null

function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL })
  return pool
}

export async function query(sql, params) {
  return getPool().query(sql, params)
}

export async function ensureGcalTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS gcal_tokens (
      user_id TEXT PRIMARY KEY,
      tokens_enc TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export async function getUserById(id) {
  try {
    const result = await getPool().query('SELECT id, name, email FROM "user" WHERE id = $1', [id])
    return result.rows[0] || null
  } catch {
    return null
  }
}

export async function getAllUsers() {
  try {
    const result = await getPool().query('SELECT id, name, email FROM "user"')
    return result.rows
  } catch {
    return []
  }
}
