'use client'

import type { ChassisProps } from '../../_shell/chassis-types'
import { EditorialMenuScreen } from './menu-screen'
import { EditorialItemScreen } from './item-screen'
import { EditorialCartScreen } from './cart-screen'
import { EditorialConfirmScreen } from './confirm-screen'

/** Editorial chassis entry. Switches on `state.screen` and renders the
 *  corresponding screen with the full ChassisProps payload — every screen
 *  receives the same shape, so the chassis layer never reaches around the
 *  shell for state. */
export function EditorialChassis(props: ChassisProps) {
  switch (props.state.screen) {
    case 'item':
      return <EditorialItemScreen {...props} />
    case 'cart':
      return <EditorialCartScreen {...props} />
    case 'confirm':
      return <EditorialConfirmScreen {...props} />
    case 'menu':
    default:
      return <EditorialMenuScreen {...props} />
  }
}
