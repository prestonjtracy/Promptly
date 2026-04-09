'use client'

import { useState, useTransition } from 'react'
import type {
  Venue,
  Location,
  MenuCategory,
  MenuItemWithModifiers,
  SelectedModifier,
} from '@/lib/supabase/types'
import { submitOrder } from '@/app/actions/submit-order'

// ── Theme ────────────────────────────────────────────────────
const GREEN = '#1a3d2b'
const GREEN_MID = '#2d5a3f'
const GOLD = '#c9a84c'
const CREAM = '#faf7f2'
const SAND = '#f0ebe0'
const SERIF = "'Georgia', 'Times New Roman', serif"
const SANS = "Arial, Helvetica, sans-serif"

type Props = {
  venue: Venue
  location: Location
  menuItems: MenuItemWithModifiers[]
  categories: MenuCategory[]
  cartDisplay: string
}

export function OrderPageClient({
  venue,
  location,
  menuItems,
  categories,
  cartDisplay,
}: Props) {
  // Cart: itemId → quantity
  const [cart, setCart] = useState<Record<string, number>>({})
  // Modifiers: itemId → selected option IDs
  const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({})
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0]?.id ?? ''
  )
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(
    venue.allow_delivery ? 'delivery' : 'pickup'
  )
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [view, setView] = useState<'menu' | 'review'>('menu')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // All items flat for lookups
  const allItems = menuItems

  // Compute totals
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = allItems.find((i) => i.id === id)
    if (!item) return sum
    const modTotal = (selectedMods[id] || []).reduce((ms, optId) => {
      for (const g of item.modifier_groups) {
        const opt = g.options.find((o) => o.id === optId)
        if (opt) return ms + opt.price_adjustment
      }
      return ms
    }, 0)
    return sum + ((item.price ?? 0) + modTotal) * qty
  }, 0)

  function addItem(item: MenuItemWithModifiers) {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))
  }

  function removeItem(item: MenuItemWithModifiers) {
    setCart((prev) => {
      const next = { ...prev }
      if ((next[item.id] || 0) > 1) next[item.id]--
      else delete next[item.id]
      if (!next[item.id]) {
        setSelectedMods((p) => {
          const n = { ...p }
          delete n[item.id]
          return n
        })
      }
      return next
    })
  }

  function toggleMod(itemId: string, optionId: string) {
    setSelectedMods((prev) => {
      const current = prev[itemId] || []
      return {
        ...prev,
        [itemId]: current.includes(optionId)
          ? current.filter((m) => m !== optionId)
          : [...current, optionId],
      }
    })
  }

  function handleSubmit() {
    if (venue.customer_id_label && venue.customer_id_required && !customerId.trim()) {
      setError(`Please enter your ${venue.customer_id_label.toLowerCase()}.`)
      return
    }
    if (fulfillment === 'delivery' && venue.allow_delivery && !deliveryLocation.trim()) {
      setError('Please enter a delivery location.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const items = Object.entries(cart).map(([id, qty]) => {
          const item = allItems.find((i) => i.id === id)!
          const mods: SelectedModifier[] = (selectedMods[id] || [])
            .map((optId) => {
              for (const g of item.modifier_groups) {
                const opt = g.options.find((o) => o.id === optId)
                if (opt)
                  return {
                    option_id: opt.id,
                    group_name: g.name,
                    option_name: opt.name,
                    modifier_type: opt.modifier_type,
                    price_adjustment: opt.price_adjustment,
                  } as SelectedModifier
              }
              return null
            })
            .filter((m): m is SelectedModifier => m !== null)

          return { menu_item_id: id, quantity: qty, selected_modifiers: mods }
        })

        const result = await submitOrder({
          venue_id: venue.id,
          location_id: location.id,
          fulfillment,
          delivery_location:
            fulfillment === 'delivery' ? deliveryLocation.trim() || null : null,
          customer_id_value: customerId.trim() || null,
          notes: notes.trim() || null,
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

  // ── Confirmation ──────────────────────────────────────────
  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: CREAM, fontFamily: SERIF, maxWidth: 430, margin: '0 auto', boxShadow: '0 1px 40px rgba(0,0,0,0.06)' }}
      >
        <div className="text-7xl mb-6">⛳</div>
        <h2
          className="text-2xl font-bold mb-3"
          style={{ color: GREEN, letterSpacing: '0.01em' }}
        >
          Order Received
        </h2>
        <p className="text-base mb-4" style={{ fontFamily: SANS, color: '#1c1c1c', lineHeight: 1.5 }}>
          {fulfillment === 'delivery' && deliveryLocation
            ? `We'll bring your order to ${deliveryLocation}.`
            : 'Your order will be ready for pickup.'}
        </p>
        <p className="text-sm" style={{ fontFamily: SANS, color: '#6b7280' }}>
          {venue.customer_id_label && customerId && `${venue.customer_id_label} ${customerId} · `}
          {cartDisplay}
        </p>
      </div>
    )
  }

  // ── Review view ───────────────────────────────────────────
  if (view === 'review') {
    const lineItems = Object.entries(cart).map(([id, qty]) => {
      const item = allItems.find((i) => i.id === id)!
      const mods = (selectedMods[id] || [])
        .map((optId) => {
          for (const g of item.modifier_groups) {
            const opt = g.options.find((o) => o.id === optId)
            if (opt) return opt
          }
          return null
        })
        .filter(Boolean) as { id: string; name: string; price_adjustment: number; modifier_type: string }[]
      const modTotal = mods.reduce((s, m) => s + m.price_adjustment, 0)
      return { item, qty, mods, lineTotal: ((item.price ?? 0) + modTotal) * qty }
    })

    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: CREAM, fontFamily: SERIF, maxWidth: 430, margin: '0 auto', boxShadow: '0 1px 40px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-5 py-4"
          style={{ background: GREEN, borderBottom: `3px solid ${GOLD}` }}
        >
          <button
            onClick={() => setView('menu')}
            className="text-sm border-0 bg-transparent cursor-pointer py-2 px-1"
            style={{ color: 'rgba(255,255,255,0.8)', fontFamily: SANS }}
          >
            ← Back
          </button>
          <span className="text-lg font-bold text-white" style={{ fontFamily: SERIF }}>
            Review Order
          </span>
          <span className="w-10" />
        </div>

        <div className="p-4 flex flex-col gap-3.5">
          {/* Line items card */}
          <div
            className="rounded-xl p-4"
            style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: `1px solid ${SAND}` }}
          >
            {lineItems.map(({ item, qty, mods, lineTotal }) => (
              <div key={item.id} className="flex justify-between items-start mb-3.5">
                <div className="flex gap-2.5 items-start">
                  <span className="text-sm mt-px min-w-[22px]" style={{ color: '#6b7280', fontFamily: SANS }}>
                    {qty}×
                  </span>
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: '#1c1c1c' }}>
                      {item.name}
                    </div>
                    {mods.map((m) => (
                      <div
                        key={m.id}
                        className="text-[13px] mt-0.5 pl-1"
                        style={{ color: '#6b7280', fontFamily: SANS }}
                      >
                        {m.modifier_type === 'remove' ? '− ' : '+ '}{m.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="text-[15px] font-bold"
                  style={{ color: '#1c1c1c', fontFamily: SANS }}
                >
                  ${lineTotal.toFixed(2)}
                </div>
              </div>
            ))}

            <div className="my-4" style={{ height: 1, background: SAND }} />

            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[17px] font-bold" style={{ color: '#1c1c1c' }}>Total</span>
              <span
                className="text-xl font-bold"
                style={{ color: GREEN, fontFamily: SANS }}
              >
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <p
              className="text-xs text-center mt-2 mb-0"
              style={{ color: '#6b7280', fontFamily: SANS }}
            >
              Billed to your member account
            </p>
          </div>

          {/* Details card */}
          <div
            className="rounded-xl p-4"
            style={{ background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: `1px solid ${SAND}` }}
          >
            {/* Customer ID */}
            {venue.customer_id_label && (
              <>
                <label
                  className="block text-[13px] font-semibold mb-1.5"
                  style={{ color: '#1c1c1c', fontFamily: SANS, letterSpacing: '0.02em' }}
                >
                  {venue.customer_id_label} {venue.customer_id_required && '*'}
                </label>
                <input
                  className="order-input w-full rounded-lg px-3 py-2.5 text-[15px] mb-3"
                  style={{
                    border: '1px solid rgba(0,0,0,0.15)',
                    background: CREAM,
                    fontFamily: SANS,
                    color: '#1c1c1c',
                    outline: 'none',
                  }}
                  placeholder={`e.g. 1042`}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </>
            )}

            {/* Fulfillment */}
            {(venue.allow_pickup && venue.allow_delivery) && (
              <>
                <label
                  className="block text-[13px] font-semibold mb-1.5 mt-3"
                  style={{ color: '#1c1c1c', fontFamily: SANS, letterSpacing: '0.02em' }}
                >
                  Fulfillment
                </label>
                <div className="flex gap-2">
                  {venue.allow_pickup && (
                    <button
                      className="flex-1 py-2.5 px-3 rounded-lg text-[13px] font-semibold cursor-pointer"
                      style={{
                        border: fulfillment === 'pickup' ? `1px solid ${GREEN}` : '1px solid rgba(0,0,0,0.15)',
                        background: fulfillment === 'pickup' ? GREEN : CREAM,
                        color: fulfillment === 'pickup' ? '#fff' : '#6b7280',
                        fontFamily: SANS,
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setFulfillment('pickup')}
                    >
                      Pickup
                    </button>
                  )}
                  {venue.allow_delivery && (
                    <button
                      className="flex-1 py-2.5 px-3 rounded-lg text-[13px] font-semibold cursor-pointer"
                      style={{
                        border: fulfillment === 'delivery' ? `1px solid ${GREEN}` : '1px solid rgba(0,0,0,0.15)',
                        background: fulfillment === 'delivery' ? GREEN : CREAM,
                        color: fulfillment === 'delivery' ? '#fff' : '#6b7280',
                        fontFamily: SANS,
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setFulfillment('delivery')}
                    >
                      Deliver to Location
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Delivery location */}
            {fulfillment === 'delivery' && venue.allow_delivery && (
              <>
                <label
                  className="block text-[13px] font-semibold mb-1.5 mt-3"
                  style={{ color: '#1c1c1c', fontFamily: SANS, letterSpacing: '0.02em' }}
                >
                  Delivery Location
                </label>
                <input
                  className="order-input w-full rounded-lg px-3 py-2.5 text-[15px]"
                  style={{
                    border: '1px solid rgba(0,0,0,0.15)',
                    background: CREAM,
                    fontFamily: SANS,
                    color: '#1c1c1c',
                    outline: 'none',
                  }}
                  placeholder={venue.delivery_location_placeholder || 'e.g. Hole 7'}
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                />
              </>
            )}

            {/* Notes */}
            {venue.allow_notes && (
              <>
                <label
                  className="block text-[13px] font-semibold mb-1.5 mt-3"
                  style={{ color: '#1c1c1c', fontFamily: SANS, letterSpacing: '0.02em' }}
                >
                  Notes (optional)
                </label>
                <textarea
                  className="order-input w-full rounded-lg px-3 py-2.5 text-[15px]"
                  style={{
                    border: '1px solid rgba(0,0,0,0.15)',
                    background: CREAM,
                    fontFamily: SANS,
                    color: '#1c1c1c',
                    height: 72,
                    resize: 'none',
                    outline: 'none',
                  }}
                  placeholder="Any special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="rounded-xl p-3.5 text-sm"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            className="order-submit w-full rounded-2xl py-4 text-base font-bold text-white cursor-pointer disabled:opacity-50"
            style={{
              background: GREEN,
              border: 'none',
              borderBottom: `3px solid ${GOLD}`,
              fontFamily: SANS,
              letterSpacing: '0.02em',
            }}
            disabled={isPending || (venue.customer_id_required && !customerId.trim())}
            onClick={handleSubmit}
          >
            {isPending ? 'Placing Order...' : `Place Order · $${cartTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Menu view ─────────────────────────────────────────────
  const filteredItems = activeCategory
    ? menuItems.filter((i) => i.category?.id === activeCategory)
    : menuItems.filter((i) => !i.category)

  const uncategorized = menuItems.filter((i) => !i.category)

  return (
    <div
      className="min-h-screen pb-24 relative"
      style={{ background: CREAM, fontFamily: SERIF, maxWidth: 430, margin: '0 auto', boxShadow: '0 1px 40px rgba(0,0,0,0.06)' }}
    >
      {/* Hero header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3.5 px-5 py-3.5"
        style={{
          background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_MID} 100%)`,
          borderBottom: `3px solid ${GOLD}`,
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{ background: GOLD }}
        >
          ⛳
        </div>
        <div>
          <h1 className="text-xl font-bold text-white m-0 tracking-wide">
            {venue.name}
          </h1>
          <p
            className="text-[13px] mt-0.5 m-0"
            style={{ color: 'rgba(255,255,255,0.7)', fontFamily: SANS }}
          >
            {cartDisplay}
            {venue.allow_delivery && ' · Delivery Available'}
          </p>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div
          className="sticky top-[68px] z-20 flex gap-1 px-4 overflow-x-auto hide-scrollbar"
          style={{ background: GREEN }}
        >
          {uncategorized.length > 0 && (
            <button
              className="whitespace-nowrap border-0 cursor-pointer py-3.5 px-4 text-sm font-semibold"
              style={{
                background: 'transparent',
                fontFamily: SANS,
                color: !activeCategory ? GOLD : 'rgba(255,255,255,0.6)',
                borderBottom: !activeCategory ? `3px solid ${GOLD}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onClick={() => setActiveCategory('')}
            >
              Other
            </button>
          )}
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="whitespace-nowrap border-0 cursor-pointer py-3.5 px-4 text-sm font-semibold"
              style={{
                background: 'transparent',
                fontFamily: SANS,
                color: activeCategory === cat.id ? GOLD : 'rgba(255,255,255,0.6)',
                borderBottom: activeCategory === cat.id ? `3px solid ${GOLD}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu items */}
      <div className="flex flex-col gap-3 p-4">
        {(activeCategory ? filteredItems : uncategorized).map((item) => {
          const qty = cart[item.id] || 0
          const hasMods = item.modifier_groups.some((g) => g.options.length > 0)
          const isExpanded = expandedItem === item.id

          const allMods = item.modifier_groups.flatMap((g) =>
            g.options.map((o) => ({ ...o, groupName: g.name }))
          )

          return (
            <div
              key={item.id}
              className="rounded-xl"
              style={{
                background: '#fff',
                padding: 16,
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                border: `1px solid ${SAND}`,
              }}
            >
              {/* Item row */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="text-[15px] font-bold mb-1" style={{ color: '#1c1c1c' }}>
                    {item.name}
                  </div>
                  {item.description && (
                    <div
                      className="text-[13px] mb-1.5 line-clamp-2"
                      style={{ color: '#6b7280', fontFamily: SANS, lineHeight: 1.4 }}
                    >
                      {item.description}
                    </div>
                  )}
                  {item.price !== null && (
                    <div
                      className="text-[15px] font-bold"
                      style={{ color: GREEN_MID, fontFamily: SANS }}
                    >
                      ${item.price.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {qty === 0 ? (
                    <button
                      className="border-0 rounded-lg py-2.5 px-5 text-sm font-semibold text-white cursor-pointer min-w-[70px]"
                      style={{ background: GREEN, fontFamily: SANS, letterSpacing: '0.02em' }}
                      onClick={() => {
                        addItem(item)
                        if (hasMods) setExpandedItem(item.id)
                      }}
                    >
                      Add
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-2.5 rounded-lg py-1 px-2.5"
                      style={{ background: SAND }}
                    >
                      <button
                        className="bg-transparent border-0 text-lg font-bold cursor-pointer p-1 leading-none"
                        style={{ color: GREEN }}
                        onClick={() => removeItem(item)}
                      >
                        −
                      </button>
                      <span
                        className="text-[15px] font-bold text-center min-w-[16px]"
                        style={{ color: '#1c1c1c', fontFamily: SANS }}
                      >
                        {qty}
                      </span>
                      <button
                        className="bg-transparent border-0 text-lg font-bold cursor-pointer p-1 leading-none"
                        style={{ color: GREEN }}
                        onClick={() => addItem(item)}
                      >
                        +
                      </button>
                    </div>
                  )}
                  {hasMods && qty > 0 && (
                    <button
                      className="bg-transparent rounded-full py-1 px-3 text-xs cursor-pointer"
                      style={{
                        border: `1px solid ${GREEN}`,
                        color: GREEN,
                        fontFamily: SANS,
                      }}
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    >
                      {isExpanded ? 'Done' : 'Customize'}
                    </button>
                  )}
                </div>
              </div>

              {/* Modifier chips */}
              {hasMods && isExpanded && qty > 0 && (
                <div
                  className="mt-3 pt-3 flex flex-wrap gap-2"
                  style={{ borderTop: `1px solid ${SAND}` }}
                >
                  {allMods.map((mod) => {
                    const checked = (selectedMods[item.id] || []).includes(mod.id)
                    return (
                      <button
                        key={mod.id}
                        className="rounded-full py-2 px-4 text-[13px] cursor-pointer"
                        style={{
                          background: checked ? GREEN : SAND,
                          color: checked ? '#fff' : '#1c1c1c',
                          border: checked ? `1px solid ${GREEN}` : '1px solid rgba(0,0,0,0.1)',
                          fontFamily: SANS,
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => toggleMod(item.id, mod.id)}
                      >
                        {checked && '✓ '}
                        {mod.modifier_type === 'remove' ? '− ' : ''}
                        {mod.name}
                        {mod.price_adjustment > 0 && (
                          <span style={{ color: checked ? '#fff' : GOLD, fontWeight: 'bold', marginLeft: 4 }}>
                            +${mod.price_adjustment.toFixed(2)}
                          </span>
                        )}
                        {mod.price_adjustment === 0 && mod.modifier_type !== 'remove' && (
                          <span style={{ color: checked ? 'rgba(255,255,255,0.8)' : '#6b7280', marginLeft: 4 }}>
                            Free
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {(activeCategory ? filteredItems : uncategorized).length === 0 && (
          <div className="text-center py-16" style={{ color: '#6b7280', fontFamily: SERIF, fontStyle: 'italic' }}>
            No items in this category.
          </div>
        )}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full px-4 pb-8 pt-3 z-40"
          style={{ maxWidth: 430, background: CREAM, boxShadow: '0 -4px 12px rgba(0,0,0,0.06)', boxSizing: 'border-box' }}
        >
          <div
            className="rounded-2xl py-3.5 px-5 flex justify-between items-center"
            style={{ background: GREEN }}
          >
            <span
              className="text-sm"
              style={{ color: 'rgba(255,255,255,0.7)', fontFamily: SANS }}
            >
              {cartCount} item{cartCount > 1 ? 's' : ''}
            </span>
            <button
              className="border-0 rounded-lg py-2.5 px-5 text-sm font-bold cursor-pointer"
              style={{
                background: GOLD,
                color: GREEN,
                fontFamily: SANS,
              }}
              onClick={() => setView('review')}
            >
              Review Order · ${cartTotal.toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
