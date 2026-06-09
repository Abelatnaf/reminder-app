// Side-effect module: loads .env into process.env from the PROJECT ROOT before
// anything else runs. Import this FIRST (before auth.js, config.js, etc.) so that
// modules which read process.env at load time (e.g. auth.js builds a pg Pool from
// DATABASE_URL) see the real values instead of undefined.
//
// ESM evaluates imports top-to-bottom, depth-first — so `import './env.js'` placed
// as the first import guarantees dotenv runs before any sibling module's top-level
// code. Importing it from multiple files is safe: a module's body runs only once.
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
