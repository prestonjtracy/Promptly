'use client'

import { useCallback, useState, useTransition } from 'react'
import type {
  CartEntry,
  FulfillmentType,
  Location,
  RequestWithModifiers,
  SelectedModifier,
  Venue,
} from '@/lib/supabase/types'
import { canUsePayments } from '@/lib/features'
import { submitOrder } from '@/app/actions/submit-order'
import type { ChassisActions, OrderState } from './chassis-types'

function makeCartKey(menuItemId: string, mods: SelectedModifier[]): string {
  const optionIds = mods
    .map((m) => m.option_id)
    .sort()
    .join(',')
  return `${menuItemId}|${optionIds}`
}

/**
 * The shell's hook. Owns every piece of state and logic that used to live
 * in OrderForm, refactored to drive a four-screen state machine instead of
 * a single page.
 *
 * Behavior parity points worth knowing about:
 *   - Cart entries are deduped by cartKey (menuItemId + sorted modifier
 *     option ids), so adding the same item twice with the same mods bumps
 *     quantity instead of creating a second line.
 *   - For items WITHOUT modifiers, the menu screen calls onAddSimple /
 *     onRemoveSimple inline (no item-screen detour).
 *   - For items WITH modifiers, onOpenItem navigates to the item screen.
 *     Confirming there calls onConfirmItem and returns to the menu.
 *   - onSubmit branches: payments-enabled venues POST to the Stripe
 *     Checkout route and redirect; non-Stripe venues call submitOrder and
 *     advance to the confirm screen.
 *   - Validation errors and submit failures both surface via state.error.
 */
export function useOrderState(opts: {
  venue: Venue
  location: Location
  menuItems: RequestWithModifiers[]
}): { state: OrderState; actions: ChassisActions } {
  const { venue, location, menuItems } = opts

  const [screen, setScreen] = useState<OrderState['screen']>('menu')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(
    venue.allow_delivery ? 'delivery' : 'pickup',
  )
  const [customerIdValue, setCustomerIdValue] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [orderNumber, setOrderNumber] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onAddSimple = useCallback((itemId: string) => {
    const key = `${itemId}|`
    setCart((prev) => {
      const existing = prev.find((e) => e.cartKey === key)
      if (existing) {
        return prev.map((e) =>
          e.cartKey === key ? { ...e, quantity: e.quantity + 1 } : e,
        )
      }
      return [
        ...prev,
        { cartKey: key, menuItemId: itemId, quantity: 1, selectedModifiers: [] },
      ]
    })
  }, [])

  const onRemoveSimple = useCallback((itemId: string) => {
    const key = `${itemId}|`
    setCart((prev) => {
      const existing = prev.find((e) => e.cartKey === key)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter((e) => e.cartKey !== key)
      return prev.map((e) =>
        e.cartKey === key ? { ...e, quantity: e.quantity - 1 } : e,
      )
    })
  }, [])

  const onOpenItem = useCallback((itemId: string) => {
    setActiveItemId(itemId)
    setScreen('item')
  }, [])

  const onProceedToReview = useCallback(() => {
    setError(null)
    setScreen('cart')
  }, [])

  const onConfirmItem = useCallback(
    (qty: number, mods: SelectedModifier[]) => {
      const itemId = activeItemId
      if (!itemId || qty <= 0) {
        setActiveItemId(null)
        setScreen('menu')
        return
      }
      const key = makeCartKey(itemId, mods)
      setCart((prev) => {
        const existing = prev.find((e) => e.cartKey === key)
        if (existing) {
          return prev.map((e) =>
            e.cartKey === key ? { ...e, quantity: e.quantity + qty } : e,
          )
        }
        return [
          ...prev,
          {
            cartKey: key,
            menuItemId: itemId,
            quantity: qty,
            selectedModifiers: mods,
          },
        ]
      })
      setActiveItemId(null)
      setScreen('menu')
    },
    [activeItemId],
  )

  const onCancelItem = useCallback(() => {
    setActiveItemId(null)
    setScreen('menu')
  }, [])

  const onUpdateCartEntry = useCallback((cartKey: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((e) => e.cartKey !== cartKey)
      return prev.map((e) => (e.cartKey === cartKey ? { ...e, quantity: qty } : e))
    })
  }, [])

  const onChangeFulfillment = useCallback((mode: FulfillmentType) => {
    setFulfillment(mode)
  }, [])

  const onSubmit = useCallback(async () => {
    const totalItems = cart.reduce((s, e) => s + e.quantity, 0)
    if (totalItems === 0) {
      setError('Your cart is empty.')
      return
    }
    if (
      fulfillment === 'delivery' &&
      venue.allow_delivery &&
      !deliveryLocation.trim()
    ) {
      setError('Please enter a delivery location.')
      return
    }
    if (
      venue.customer_id_label &&
      venue.customer_id_required &&
      !customerIdValue.trim()
    ) {
      setError(`Please enter your ${venue.customer_id_label.toLowerCase()}.`)
      return
    }

    setError(null)

    await new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const items = cart.map((entry) => ({
            menu_item_id: entry.menuItemId,
            quantity: entry.quantity,
            selected_modifiers: entry.selectedModifiers,
          }))

          // Stripe-enabled branch: redirect to hosted checkout. The success
          // route persists the order + fires Slack — same as the legacy flow.
          if (venue.payments_enabled && canUsePayments(venue)) {
            const res = await fetch('/api/create-checkout-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                venueSlug: venue.slug,
                locationId: location.id,
                cart: items,
                fulfillment,
                deliveryLocation:
                  fulfillment === 'delivery'
                    ? deliveryLocation.trim() || null
                    : null,
                customerIdValue: customerIdValue.trim() || null,
                notes: venue.allow_notes ? notes.trim() || null : null,
              }),
            })
            const data = (await res.json()) as { url?: string; error?: string }
            if (!res.ok || data.error || !data.url) {
              setError(data.error ?? 'Unable to start checkout. Please try again.')
              resolve()
              return
            }
            window.location.href = data.url
            // Don't resolve — the page is unloading.
            return
          }

          const result = await submitOrder({
            venue_id: venue.id,
            location_id: location.id,
            fulfillment,
            delivery_location:
              fulfillment === 'delivery' ? deliveryLocation.trim() || null : null,
            customer_id_value: customerIdValue.trim() || null,
            notes: venue.allow_notes ? notes.trim() || null : null,
            items,
          })

          if (result.error) {
            setError(result.error)
          } else {
            setOrderNumber(result.orderNumber)
            setScreen('confirm')
          }
        } catch {
          setError('Something went wrong. Please try again.')
        } finally {
          resolve()
        }
      })
    })
  }, [cart, fulfillment, customerIdValue, notes, deliveryLocation, venue, location])

  const onPlaceAnother = useCallback(() => {
    setCart([])
    setCustomerIdValue('')
    setNotes('')
    setDeliveryLocation('')
    setOrderNumber(undefined)
    setError(null)
    setScreen('menu')
  }, [])

  const onBack = useCallback(() => {
    if (screen === 'item') {
      setActiveItemId(null)
      setScreen('menu')
    } else if (screen === 'cart') {
      setScreen('menu')
    }
    // No back from menu or confirm.
  }, [screen])

  // The menuItems prop isn't part of state but is closed over by some
  // callbacks via the hook's parameters above; reference it once so an
  // unused-import lint stays quiet without hiding it from the hook signature.
  void menuItems

  const state: OrderState = {
    screen,
    cart,
    activeItemId,
    fulfillment,
    customerIdValue,
    notes,
    deliveryLocation,
    isPending,
    error,
    orderNumber,
  }

  const actions: ChassisActions = {
    onAddSimple,
    onRemoveSimple,
    onOpenItem,
    onProceedToReview,
    onConfirmItem,
    onCancelItem,
    onUpdateCartEntry,
    onChangeFulfillment,
    onChangeCustomerId: setCustomerIdValue,
    onChangeNotes: setNotes,
    onChangeDeliveryLocation: setDeliveryLocation,
    onSubmit,
    onPlaceAnother,
    onBack,
  }

  return { state, actions }
}
