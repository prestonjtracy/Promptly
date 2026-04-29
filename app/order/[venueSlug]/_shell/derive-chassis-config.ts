/**
 * Pure venue+location → ChassisConfig mapping.
 *
 * Anywhere a venue's data needs to be reshaped before the chassis sees it,
 * it happens here. Chassis components stay free of business-logic seams.
 *
 * No chassis-specific defaults live here — when a venue field is null, this
 * function passes null through and lets each chassis decide its own
 * fallback wording. Keeps Editorial's "WHERE ARE YOU?" out of code shared
 * with a hypothetical Modern chassis that would prefer "Where are you?".
 */
import type { Location, Venue } from '@/lib/supabase/types'
import type { ChassisConfig } from './chassis-types'

/** Compute the fulfillment mode from the existing allow_pickup /
 *  allow_delivery booleans. Centralized so the chassis never has to reach
 *  for either flag directly. */
function deriveFulfillmentMode(venue: Venue): ChassisConfig['fulfillmentMode'] {
  if (venue.allow_pickup && venue.allow_delivery) return 'both'
  if (venue.allow_delivery) return 'delivery'
  if (venue.allow_pickup) return 'pickup'
  return 'none' // misconfigured — chassis should render defensively
}

/** Format the location string for the chassis. Editorial wants uppercase;
 *  the actual casing transform is the chassis's job, but we hand it a
 *  canonical, non-empty string here so the chassis just renders. */
function formatLocationDisplay(venue: Venue, location: Location): string {
  // Prefer the user-entered name. If it doesn't already include the type
  // label noun (e.g. name = "7", venue.location_type_label = "Hole"), the
  // chassis can prepend it visually — but here we just give it the most
  // descriptive single string we have. Admins who want "HOLE 7" should
  // enter "Hole 7" as the location name (matches existing convention).
  return location.name || location.code || venue.location_type_label
}

/** Bare identifier for the two-corner masthead. Pairs with location_subhead
 *  to render "ON CART 4" without duplicating the noun. Falls back to the
 *  same source as locationDisplay if no code is set. */
function formatLocationCode(venue: Venue, location: Location): string {
  return location.code || location.name || venue.location_type_label
}

export function deriveChassisConfig(
  venue: Venue,
  location: Location,
): ChassisConfig {
  return {
    tagline: venue.tagline,
    locationDisplay: formatLocationDisplay(venue, location),
    locationCode: formatLocationCode(venue, location),
    locationSubhead: venue.location_subhead,
    locationQuestionLabel: venue.location_question_label,
    fulfillmentMode: deriveFulfillmentMode(venue),
    submitCtaLabel: venue.submit_cta_label,
    successHeadline: venue.success_headline,
    fulfillmentCopy: venue.fulfillment_copy,
    etaMinutes: venue.default_fulfillment_eta_minutes,
    billingState: venue.billing_state,
  }
}
