import type { Venue, VenueFeatures } from '@/lib/supabase/types'

/**
 * Check if a feature is enabled for a venue/workspace.
 * Centralizes feature gating so future pricing tiers or
 * paid add-ons only need to change this one file.
 */
export function hasFeature(
  venue: Venue,
  feature: keyof VenueFeatures
): boolean {
  return venue.features?.[feature] === true
}
