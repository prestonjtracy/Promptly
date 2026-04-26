'use server'

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { isKnownTier } from '@/lib/super-admin/platform-config'
import type { VenueFeatures } from '@/lib/supabase/types'

// Deliberately distinct from the venue-admin cookie. A venue admin session
// must NEVER be interpretable as a super-admin session, and vice versa.
const SUPER_ADMIN_COOKIE = 'promptly_super_admin'
const SESSION_TTL_SECONDS = 60 * 60 * 24 // 24 hours
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 min sliding window
const RATE_LIMIT_MAX_ATTEMPTS = 5

// ── Helpers ──────────────────────────────────────────────────

/** Constant-time string compare against the env-var passcode. Short-circuits
 *  on length mismatch so the compare itself runs on equal-length buffers. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

/** Best-effort client IP for rate limiting. Vercel's edge sets
 *  x-forwarded-for and x-real-ip; locally these are absent so all dev
 *  traffic shares the 'local' bucket (acceptable since dev isn't a
 *  prod attack surface). The leftmost x-forwarded-for entry is the
 *  client; downstream entries are CDN hops. */
async function getClientIp(): Promise<string> {
  const h = await headers()
  const xff = h.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = h.get('x-real-ip')
  if (real) return real
  return 'local'
}

// ── Auth ─────────────────────────────────────────────────────

/**
 * Outcomes:
 *   { success: true }                            — login OK; cookie set
 *   { error: 'Super admin is not configured.' } — env var unset
 *   { error: 'Too many attempts. Try again later.' } — rate-limited
 *   { error: 'Incorrect passcode.' }            — wrong passcode
 */
export async function loginSuperAdmin(passcode: string) {
  const expected = process.env.SUPER_ADMIN_PASSCODE

  // Refuse all logins if the env var is missing. An unconfigured platform
  // must never auto-allow.
  if (!expected || expected.length === 0) {
    return { error: 'Super admin is not configured.' }
  }

  const supabase = createServiceClient()
  const ip = await getClientIp()
  const now = new Date()

  // Atomic rate-limit gate: a Postgres function holds a per-IP advisory
  // lock around cleanup → count → maybe-insert, so two concurrent requests
  // can't both observe count=4 and both proceed. The function returns true
  // when the attempt is allowed (and HAS recorded the attempt row); false
  // when this IP has already used its allowance for the window.
  // See migration 00019.
  const { data: allowed, error: rateErr } = await supabase.rpc(
    'check_and_record_super_admin_attempt',
    {
      p_ip: ip,
      p_window_seconds: Math.floor(RATE_LIMIT_WINDOW_MS / 1000),
      p_max_attempts: RATE_LIMIT_MAX_ATTEMPTS,
    },
  )

  if (rateErr) {
    // Fail closed: a DB error here is preferable to letting a request
    // through unchecked. Don't expose the underlying error to the caller.
    console.error('[loginSuperAdmin] rate-limit RPC failed', rateErr.message)
    return { error: 'Could not verify rate limit. Try again.' }
  }

  if (allowed === false) {
    // Leaking "you're rate-limited" vs "wrong passcode" is intentional —
    // we want attackers to back off, and a real admin who mistyped sees a
    // distinct, actionable message.
    return { error: 'Too many attempts. Try again later.' }
  }

  // From here on the attempt has already been recorded. A wrong passcode
  // simply leaves the row as a failed-attempt audit; the success branch
  // clears all of this IP's rows after the bcrypt-style compare.
  if (!safeEqual(passcode, expected)) {
    return { error: 'Incorrect passcode.' }
  }

  // Success path. Issue a fresh, cryptographically random token; store the
  // active session server-side; set the cookie to that opaque token.
  const token = randomBytes(32).toString('hex') // 256 bits, 64 hex chars
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000)

  const { error: insertErr } = await supabase
    .from('super_admin_sessions')
    .insert({ token, expires_at: expiresAt.toISOString() })

  if (insertErr) {
    return { error: 'Could not start a session. Please try again.' }
  }

  // Sweep expired sessions on every successful login. Cheap, infrequent.
  await supabase
    .from('super_admin_sessions')
    .delete()
    .lt('expires_at', now.toISOString())

  // Friendly: clear THIS IP's prior failed attempts so a real admin who
  // mistyped a few times doesn't have a stale fail count for the next
  // 15 minutes.
  await supabase.from('super_admin_login_attempts').delete().eq('ip', ip)

  const cookieStore = await cookies()
  cookieStore.set(SUPER_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })

  return { success: true }
}

export async function logoutSuperAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SUPER_ADMIN_COOKIE)?.value

  if (token) {
    // Best-effort: remove the row so the token can't be reused even if
    // the cookie is somehow recovered. If the delete fails (DB blip) the
    // cookie is still cleared client-side and the row will age out at
    // expires_at anyway.
    const supabase = createServiceClient()
    await supabase.from('super_admin_sessions').delete().eq('token', token)
  }

  cookieStore.delete(SUPER_ADMIN_COOKIE)
}

export async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SUPER_ADMIN_COOKIE)?.value
  if (!token) return false

  // Format guard: tokens are exactly 64 lowercase hex chars. Anything else
  // is a stale '1' cookie from before this fix, garbage from XSS attempts,
  // or a corrupted value — skip the DB lookup. Doesn't change correctness
  // (the lookup would return null) but avoids a query on every junk hit.
  if (!/^[a-f0-9]{64}$/.test(token)) return false

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('super_admin_sessions')
    .select('expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!data) return false
  const row = data as { expires_at: string }
  return new Date(row.expires_at) > new Date()
}

// ── Mutations (service-role client; cookie gate is the authz) ───

export async function updateVenueFlag(
  venueId: string,
  flagKey: keyof VenueFeatures,
  enabled: boolean,
) {
  if (!(await isSuperAdmin())) {
    return { error: 'Unauthorized.' }
  }

  const supabase = createServiceClient()

  // Read-merge-write on the features JSONB so other flags (and any future
  // flag added before this client shipped) aren't wiped. A jsonb_set RPC
  // would be nicer but this keeps the server-action surface self-contained.
  const { data: row, error: readErr } = await supabase
    .from('venues')
    .select('features')
    .eq('id', venueId)
    .single()

  if (readErr || !row) return { error: 'Venue not found.' }

  const current = ((row as { features: VenueFeatures | null }).features ??
    {}) as Record<string, unknown>
  const merged = { ...current, [flagKey]: enabled }

  const { error: writeErr } = await supabase
    .from('venues')
    .update({ features: merged })
    .eq('id', venueId)

  if (writeErr) return { error: 'Failed to update flag.' }
  return { success: true }
}

export async function updateVenueTier(venueId: string, tier: string) {
  if (!(await isSuperAdmin())) {
    return { error: 'Unauthorized.' }
  }

  if (!isKnownTier(tier)) {
    return { error: 'Unknown tier.' }
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('venues')
    .update({ tier })
    .eq('id', venueId)

  if (error) return { error: 'Failed to update tier.' }
  return { success: true }
}
