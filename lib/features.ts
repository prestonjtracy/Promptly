import type { Venue, VenueFeatures } from '@/lib/supabase/types'

/**
 * Check if a feature is enabled for a venue/workspace.
 * Centralizes feature gating so future pricing tiers or
 * paid add-ons only need to change this one file.
 */
export function hasFeature(
  venue: Pick<Venue, 'features'>,
  feature: keyof VenueFeatures
): boolean {
  return venue.features?.[feature] === true
}

/**
 * Payments UI is only visible to full_commerce venues. pos_only venues
 * have their own POS — Promptly must not attempt to charge on their behalf.
 */
export function canUsePayments(venue: Pick<Venue, 'plan_type'>): boolean {
  return venue.plan_type === 'full_commerce'
}
