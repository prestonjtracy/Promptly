'use client'

import type {
  Location,
  RequestWithModifiers,
  Venue,
} from '@/lib/supabase/types'
import { EditorialChassis } from '../_chassis/editorial'
import { deriveChassisConfig } from './derive-chassis-config'
import { useOrderState } from './use-order-state'

/**
 * Chassis-agnostic shell. Holds all state, picks the right chassis for the
 * venue, and hands the chassis a fully-resolved `ChassisProps` payload.
 *
 * Chassis selection is currently a single chassis (Editorial). When a second
 * chassis is added, switch on something like `venue.chassis` here and route
 * to the corresponding component. The chassis swap should not require any
 * change above this file.
 */
export function OrderShell({
  venue,
  location,
  menuItems,
}: {
  venue: Venue
  location: Location
  menuItems: RequestWithModifiers[]
}) {
  const { state, actions } = useOrderState({ venue, location, menuItems })
  const config = deriveChassisConfig(venue, location)

  // Single chassis today. Add a venue.chassis switch here to land Modern.
  return (
    <EditorialChassis
      venue={venue}
      location={location}
      menuItems={menuItems}
      config={config}
      state={state}
      actions={actions}
    />
  )
}
