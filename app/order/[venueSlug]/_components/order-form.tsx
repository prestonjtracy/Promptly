'use client'

import { useState, useTransition, useCallback } from 'react'
import type {
  Venue,
  Location,
  FulfillmentType,
  RequestWithModifiers,
  CartEntry,
  SelectedModifier,
} from '@/lib/supabase/types'
import { submitOrder } from '@/app/actions/submit-order'
import { MenuItemCard } from './menu-item-card'
import { ModifierModal } from './modifier-modal'
import { FulfillmentToggle } from './fulfillment-toggle'
import { CustomerIdInput } from './customer-id-input'
import { OrderSummary } from './order-summary'
import { OrderConfirmation } from './order-confirmation'

function makeCartKey(
  menuItemId: string,
  selectedModifiers: SelectedModifier[]
): string {
  const optionIds = selectedModifiers
    .map((m) => m.option_id)
    .sort()
    .join(',')
  return `${menuItemId}|${optionIds}`
}

function getTotalQuantityForItem(cart: CartEntry[], itemId: string): number {
  return cart
    .filter((e) => e.menuItemId === itemId)
    .reduce((s, e) => s + e.quantity, 0)
}

type OrderFormProps = {
  venue: Venue
  location: Location
  menuItems: RequestWithModifiers[]
}

export function OrderForm({ venue, location, menuItems }: OrderFormProps) {
  const [cart, setCart] = useState<CartEntry[]>([])
  const [modalItem, setModalItem] = useState<RequestWithModifiers | null>(null)
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(
    venue.allow_delivery ? 'delivery' : 'pickup'
  )
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalItems = cart.reduce((sum, entry) => sum + entry.quantity, 0)

  // Simple add/remove for items WITHOUT modifiers
  const handleSimpleAdd = useCallback((itemId: string) => {
    const key = `${itemId}|`
    setCart((prev) => {
      const existing = prev.find((e) => e.cartKey === key)
      if (existing) {
        return prev.map((e) =>
          e.cartKey === key ? { ...e, quantity: e.quantity + 1 } : e
        )
      }
      return [
        ...prev,
        { cartKey: key, menuItemId: itemId, quantity: 1, selectedModifiers: [] },
      ]
    })
  }, [])

  const handleSimpleRemove = useCallback((itemId: string) => {
    const key = `${itemId}|`
    setCart((prev) => {
      const existing = prev.find((e) => e.cartKey === key)
      if (!existing) return prev
      if (existing.quantity <= 1) return prev.filter((e) => e.cartKey !== key)
      return prev.map((e) =>
        e.cartKey === key ? { ...e, quantity: e.quantity - 1 } : e
      )
    })
  }, [])

  // Modifier items: open modal
  const handleOpenModal = useCallback((item: RequestWithModifiers) => {
    setModalItem(item)
  }, [])

  const handleModalConfirm = (selectedModifiers: SelectedModifier[]) => {
    if (!modalItem) return
    const key = makeCartKey(modalItem.id, selectedModifiers)
    setCart((prev) => {
      const existing = prev.find((e) => e.cartKey === key)
      if (existing) {
        return prev.map((e) =>
          e.cartKey === key ? { ...e, quantity: e.quantity + 1 } : e
        )
      }
      return [
        ...prev,
        {
          cartKey: key,
          menuItemId: modalItem.id,
          quantity: 1,
          selectedModifiers,
        },
      ]
    })
    setModalItem(null)
  }

  const handleCartEntryQuantityChange = useCallback(
    (cartKey: string, newQty: number) => {
      setCart((prev) => {
        if (newQty <= 0) return prev.filter((e) => e.cartKey !== cartKey)
        return prev.map((e) =>
          e.cartKey === cartKey ? { ...e, quantity: newQty } : e
        )
      })
    },
    []
  )

  const handleSubmit = () => {
    if (totalItems === 0) return

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
      !customerId.trim()
    ) {
      setError(`Please enter your ${venue.customer_id_label.toLowerCase()}.`)
      return
    }

    setError(null)

    startTransition(async () => {
      try {
        const items = cart.map((entry) => ({
          menu_item_id: entry.menuItemId,
          quantity: entry.quantity,
          selected_modifiers: entry.selectedModifiers,
        }))

        const result = await submitOrder({
          venue_id: venue.id,
          location_id: location.id,
          fulfillment,
          delivery_location:
            fulfillment === 'delivery' ? deliveryLocation.trim() || null : null,
          customer_id_value: customerId.trim() || null,
          notes: venue.allow_notes ? notes.trim() || null : null,
          items,
        })

        if (result.error) {
          setError(result.error)
        } else {
          setSubmitted(true)
        }
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const handleNewOrder = () => {
    setCart([])
    setDeliveryLocation('')
    setCustomerId('')
    setNotes('')
    setSubmitted(false)
    setError(null)
  }

  // ── Submitted state ────────────────────────────────────────
  if (submitted) {
    return (
      <div
        style={
          {
            '--venue-primary': venue.primary_color,
            '--venue-accent': venue.accent_color,
          } as React.CSSProperties
        }
      >
        <OrderConfirmation
          venue={venue}
          location={location}
          onNewOrder={handleNewOrder}
        />
      </div>
    )
  }

  // ── Group menu items by category ───────────────────────────
  const uncategorized: RequestWithModifiers[] = []
  const categoryMap = new Map<
    string,
    { name: string; sortOrder: number; items: RequestWithModifiers[] }
  >()

  for (const item of menuItems) {
    if (item.category) {
      const existing = categoryMap.get(item.category.id)
      if (existing) {
        existing.items.push(item)
      } else {
        categoryMap.set(item.category.id, {
          name: item.category.name,
          sortOrder: item.category.sort_order,
          items: [item],
        })
      }
    } else {
      uncategorized.push(item)
    }
  }

  const sortedCategories = Array.from(categoryMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  )

  const renderMenuItemCard = (item: RequestWithModifiers) => {
    const hasModifiers = item.modifier_groups.length > 0
    return (
      <MenuItemCard
        key={item.id}
        item={item}
        totalQuantity={getTotalQuantityForItem(cart, item.id)}
        hasModifiers={hasModifiers}
        onAdd={() => handleSimpleAdd(item.id)}
        onAddWithModifiers={() => handleOpenModal(item)}
        onRemove={() => handleSimpleRemove(item.id)}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-gray-50 pb-28"
      style={
        {
          '--venue-primary': venue.primary_color,
          '--venue-accent': venue.accent_color,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-4 shadow-sm"
        style={{ backgroundColor: venue.primary_color }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {venue.logo_url && (
            <img
              src={venue.logo_url}
              alt={`${venue.name} logo`}
              className="w-10 h-10 rounded-lg object-cover bg-white"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{venue.name}</h1>
            <p className="text-sm text-white/80">
              {venue.location_type_label}: {location.name}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Menu items */}
        {menuItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Nothing available right now.
            </p>
          </div>
        ) : (
          <>
            {/* Uncategorized items first */}
            {uncategorized.length > 0 && (
              <section className="space-y-3">
                {uncategorized.map(renderMenuItemCard)}
              </section>
            )}

            {/* Categorized items */}
            {sortedCategories.map((cat) => (
              <section key={cat.name} className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  {cat.name}
                </h2>
                {cat.items.map(renderMenuItemCard)}
              </section>
            ))}

            {/* ── Below menu: fulfillment, delivery location, customer ID, notes ── */}
            <div className="border-t border-gray-200 pt-6 space-y-5">
              {/* Fulfillment toggle */}
              <FulfillmentToggle
                value={fulfillment}
                onChange={setFulfillment}
                allowPickup={venue.allow_pickup}
                allowDelivery={venue.allow_delivery}
              />

              {/* Delivery location — shown when delivery is selected */}
              {fulfillment === 'delivery' && venue.allow_delivery && (
                <div className="space-y-2">
                  <label
                    htmlFor="delivery-location"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Delivery Location
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="delivery-location"
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder={venue.delivery_location_placeholder || `e.g. "Hole 7", "Poolside chair 3", "Room 412"`}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-[var(--venue-accent)] focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Customer ID */}
              {venue.customer_id_label && (
                <CustomerIdInput
                  label={venue.customer_id_label}
                  required={venue.customer_id_required}
                  value={customerId}
                  onChange={setCustomerId}
                />
              )}

              {/* Notes */}
              {venue.allow_notes && (
                <div className="space-y-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests..."
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-[var(--venue-accent)] focus:outline-none transition-colors resize-none"
                  />
                </div>
              )}
            </div>

            {/* Order summary */}
            {totalItems > 0 && (
              <OrderSummary
                cart={cart}
                menuItems={menuItems}
                fulfillment={fulfillment}
                deliveryLocation={
                  fulfillment === 'delivery' ? deliveryLocation : ''
                }
                customerIdLabel={venue.customer_id_label}
                customerIdValue={customerId}
                notes={notes}
                onEntryQuantityChange={handleCartEntryQuantityChange}
              />
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div
            ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}
      </main>

      {/* Sticky submit bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-10">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full py-4 rounded-xl text-white font-semibold text-lg transition-opacity disabled:opacity-50"
              style={{ backgroundColor: venue.accent_color }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                `Submit Request (${totalItems} item${totalItems !== 1 ? 's' : ''})`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modifier modal */}
      {modalItem && (
        <ModifierModal
          item={modalItem}
          onConfirm={handleModalConfirm}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  )
}
