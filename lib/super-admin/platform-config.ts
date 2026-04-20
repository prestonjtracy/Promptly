import type { VenueFeatures } from '@/lib/supabase/types'

/**
 * Platform-owned configuration. These are NOT venue-editable — they represent
 * what the platform owner (Preston) has granted or priced. The super-admin
 * page is the only UI that should touch them.
 *
 * Add a new feature flag by appending one entry here — nothing else needs to
 * change for it to show up as a toggle in the super-admin venue view.
 */

export type PlatformFlag = {
  key: keyof VenueFeatures
  label: string
  description: string
}

export const PLATFORM_FLAGS: PlatformFlag[] = [
  {
    key: 'custom_tabs',
    label: 'Custom Tabs',
    description:
      'Per-venue configurable tab layout on the customer page. Without this, venues get the default category-stacked rendering.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description:
      'Enables the Analytics tab in the venue admin — order counts, peak times, top items.',
  },
]

/** Tier labels. Free-form at the DB level; this list drives the dropdown UI. */
export const PLATFORM_TIERS = ['basic', 'branded', 'pro'] as const

export type PlatformTier = (typeof PLATFORM_TIERS)[number]

export function isKnownTier(value: string): value is PlatformTier {
  return (PLATFORM_TIERS as readonly string[]).includes(value)
}
