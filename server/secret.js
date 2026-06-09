import './env.js'
import crypto from 'node:crypto'

// Centralized server secret. Used to sign sessions (better-auth), sign OAuth
// state, and derive the at-rest encryption key for stored tokens.
const DEV_DEFAULT = 'dev-secret-change-in-production'
const secret = process.env.BETTER_AUTH_SECRET || DEV_DEFAULT

// Fail fast in production rather than silently signing with a public default —
// a known secret means anyone can forge a valid session cookie.
if (process.env.NODE_ENV === 'production' && (!process.env.BETTER_AUTH_SECRET || secret === DEV_DEFAULT)) {
  throw new Error(
    'FATAL: BETTER_AUTH_SECRET is not set in production. Sessions would be signed with a ' +
    'publicly-known default, allowing anyone to forge logins. Set a strong value, e.g.:\n' +
    '  BETTER_AUTH_SECRET=' + crypto.randomBytes(32).toString('base64')
  )
}

export const AUTH_SECRET = secret

// 32-byte key derived from the secret for AES-256-GCM at-rest encryption.
export const ENC_KEY = crypto.createHash('sha256').update(`enc:${secret}`).digest()

// HMAC-SHA256 over a string, returned base64url. Used to sign OAuth state.
export function hmac(data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url')
}

// Constant-time compare of two base64url signatures.
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

// AES-256-GCM encrypt/decrypt of a UTF-8 string. Returns a compact
// "v1.<iv>.<tag>.<ciphertext>" token (all base64url), or parses one back.
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.')
}

export function decrypt(token) {
  const [v, ivB, tagB, ctB] = String(token).split('.')
  if (v !== 'v1') throw new Error('bad ciphertext')
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivB, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]).toString('utf8')
}
