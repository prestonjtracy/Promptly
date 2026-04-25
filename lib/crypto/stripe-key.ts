/**
 * Application-layer encryption for venues.stripe_secret_key.
 *
 * The DB column previously held plaintext sk_live_* / sk_test_* keys. A
 * service-role leak or DB dump exposed customer funds across every venue.
 * This module wraps each key with AES-256-GCM before storage. The key
 * material lives in STRIPE_KEY_ENCRYPTION_SECRET (32 bytes, base64 in env).
 *
 * Storage format: 'v1:<iv_b64>:<ciphertext_b64>:<authTag_b64>'
 *   - v1 prefix lets us rotate algorithms or keys later without ambiguity.
 *   - 12-byte IV is GCM's recommended size, generated fresh per encryption.
 *   - 16-byte authTag detects tampering or wrong-key decryption.
 *
 * Backward compat: decryptStripeKey() also accepts legacy plaintext that
 * starts with 'sk_' so the encrypt-on-next-write rollout doesn't break
 * checkout for any venue whose key hasn't been re-saved yet. The startup
 * cost is one in-prod admin action ("paste the key again, save") OR running
 * scripts/migrate-stripe-keys.mjs.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM standard
const KEY_LENGTH = 32 // 256-bit
const VERSION = 'v1'

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env.STRIPE_KEY_ENCRYPTION_SECRET
  if (!raw) {
    throw new Error(
      'STRIPE_KEY_ENCRYPTION_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env.local and Vercel.',
    )
  }

  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `STRIPE_KEY_ENCRYPTION_SECRET must decode to ${KEY_LENGTH} bytes (got ${buf.length}). Use \`openssl rand -base64 32\`.`,
    )
  }
  cachedKey = buf
  return buf
}

/** True if the value is in the encrypted v1 format. */
export function isEncryptedKey(value: string): boolean {
  return value.startsWith(`${VERSION}:`)
}

/** True if the value looks like a legacy plaintext Stripe key. */
export function isLegacyPlaintextKey(value: string): boolean {
  return value.startsWith('sk_')
}

/**
 * Encrypt a Stripe secret key for storage. Idempotent: if `plain` is already
 * in the v1 ciphertext format, it's returned unchanged. This keeps callers
 * (e.g. the bulk migration script) from having to special-case mixed input.
 */
export function encryptStripeKey(plain: string): string {
  if (isEncryptedKey(plain)) return plain

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString('base64'),
    ciphertext.toString('base64'),
    authTag.toString('base64'),
  ].join(':')
}

/**
 * Decrypt a stored Stripe key. Accepts:
 *   - 'v1:...' encrypted blobs — decrypted via the env-var key.
 *   - Legacy 'sk_*' plaintext — returned unchanged.
 * Anything else throws so a corrupted row fails loud, not silent.
 */
export function decryptStripeKey(stored: string): string {
  if (isLegacyPlaintextKey(stored)) return stored

  if (!isEncryptedKey(stored)) {
    throw new Error('Stripe key has unrecognized format (neither v1 nor legacy plaintext).')
  }

  const parts = stored.split(':')
  if (parts.length !== 4) {
    throw new Error('Stripe key v1 format is malformed.')
  }
  const [, ivB64, ctB64, tagB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plain.toString('utf8')
}
