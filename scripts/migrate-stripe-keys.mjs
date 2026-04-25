#!/usr/bin/env node
/**
 * One-shot: re-encrypt every plaintext Stripe key in the venues table.
 *
 * Reads .env.local for credentials. Talks to Supabase over the REST API
 * with the service-role key. Idempotent — already-encrypted rows are
 * skipped.
 *
 *   node scripts/migrate-stripe-keys.mjs
 *
 * The encryption logic is intentionally duplicated from
 * lib/crypto/stripe-key.ts so this script has zero non-stdlib dependencies
 * and Just Runs. Keep the two implementations in sync if either changes.
 */

import { readFileSync } from 'node:fs'
import { createCipheriv, randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

const ENV_FILE = resolve(process.cwd(), '.env.local')

// ── Minimal .env.local loader (no dotenv dep) ────────────────
function loadEnv(path) {
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!m) continue
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}
loadEnv(ENV_FILE)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ENCRYPTION_SECRET = process.env.STRIPE_KEY_ENCRYPTION_SECRET

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}
if (!ENCRYPTION_SECRET) {
  console.error(
    'Missing STRIPE_KEY_ENCRYPTION_SECRET in .env.local. Generate with `openssl rand -base64 32`.',
  )
  process.exit(1)
}

const KEY_BUF = Buffer.from(ENCRYPTION_SECRET, 'base64')
if (KEY_BUF.length !== 32) {
  console.error(
    `STRIPE_KEY_ENCRYPTION_SECRET must decode to 32 bytes (got ${KEY_BUF.length}).`,
  )
  process.exit(1)
}

function encryptStripeKey(plain) {
  if (plain.startsWith('v1:')) return plain // already encrypted
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY_BUF, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64'),
    ct.toString('base64'),
    tag.toString('base64'),
  ].join(':')
}

// ── REST helpers ─────────────────────────────────────────────
async function rest(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text}`)
  }
  return res
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/venues?select=id,slug,stripe_secret_key&stripe_secret_key=not.is.null`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  )
  if (!listRes.ok) {
    throw new Error(`Failed to list venues: HTTP ${listRes.status}`)
  }
  const rows = await listRes.json()

  let migrated = 0
  let skipped = 0
  for (const row of rows) {
    if (!row.stripe_secret_key) continue
    if (row.stripe_secret_key.startsWith('v1:')) {
      skipped++
      continue
    }
    if (!row.stripe_secret_key.startsWith('sk_')) {
      console.warn(
        `[skip] venue ${row.slug}: unrecognized key format (does not start with sk_ or v1:).`,
      )
      continue
    }
    const encrypted = encryptStripeKey(row.stripe_secret_key)
    await rest('PATCH', `venues?id=eq.${row.id}`, { stripe_secret_key: encrypted })
    console.log(`[ok]   venue ${row.slug}: encrypted.`)
    migrated++
  }

  console.log(`\nDone. Encrypted: ${migrated}. Already encrypted: ${skipped}.`)
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
