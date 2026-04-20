'use server'

import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/service'
import { isKnownTier } from '@/lib/super-admin/platform-config'
import type { VenueFeatures } from '@/lib/supabase/types'

// Deliberately distinct from the venue-admin cookie. A venue admin session
// must NEVER be interpretable as a super-admin session, and vice versa.
const SUPER_ADMIN_COOKIE = 'promptly_super_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

/** Constant-time string compare. Short-circuits on length mismatch so the
 *  compare itself can still be done on equal-length buffers. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

// ── Auth ─────────────────────────────────────────────────────

export async function loginSuperAdmin(passcode: string) {
  const expected = process.env.SUPER_ADMIN_PASSCODE

  // If the env var isn't set, refuse all logins. Never auto-allow — an
  // unconfigured platform must not be an open platform.
  if (!expected || expected.length === 0) {
    return { error: 'Super admin is not configured.' }
  }

  if (!safeEqual(passcode, expected)) {
    return { error: 'Incorrect passcode.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(SUPER_ADMIN_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true }
}

export async function logoutSuperAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete(SUPER_ADMIN_COOKIE)
}

export async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(SUPER_ADMIN_COOKIE)?.value === '1'
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
