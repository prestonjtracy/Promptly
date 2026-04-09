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

const ACCENT = '#2563eb'

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
  const [cart, setCart] = useState<Record<string, number>>({})
  const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>({})
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id ?? '')
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

  const allItems = menuItems
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
        setSelectedMods((p) => { const n = { ...p }; delete n[item.id]; return n })
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
                if (opt) return {
                  option_id: opt.id, group_name: g.name, option_name: opt.name,
                  modifier_type: opt.modifier_type, price_adjustment: opt.price_adjustment,
                } as SelectedModifier
              }
              return null
            }).filter((m): m is SelectedModifier => m !== null)
          return { menu_item_id: id, quantity: qty, selected_modifiers: mods }
        })
        const result = await submitOrder({
          venue_id: venue.id, location_id: location.id, fulfillment,
          delivery_location: fulfillment === 'delivery' ? deliveryLocation.trim() || null : null,
          customer_id_value: customerId.trim() || null,
          notes: notes.trim() || null, items,
        })
        if (result.error) setError(result.error)
        else setSubmitted(true)
      } catch { setError('Something went wrong. Please try again.') }
    })
  }

  /* ================================================================
     CONFIRMATION
     ================================================================ */
  if (submitted) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Order received</h1>
          <p className="text-base text-gray-500 mb-1 leading-relaxed">
            {fulfillment === 'delivery' && deliveryLocation
              ? `We'll bring your order to ${deliveryLocation}.`
              : 'Your order will be ready for pickup.'}
          </p>
          <p className="text-sm text-gray-400">
            {venue.customer_id_label && customerId && `${venue.customer_id_label} ${customerId} · `}
            {cartDisplay}
          </p>
        </div>
      </div>
    )
  }

  /* ================================================================
     REVIEW
     ================================================================ */
  if (view === 'review') {
    const lineItems = Object.entries(cart).map(([id, qty]) => {
      const item = allItems.find((i) => i.id === id)!
      const mods = (selectedMods[id] || []).map((optId) => {
        for (const g of item.modifier_groups) {
          const opt = g.options.find((o) => o.id === optId)
          if (opt) return opt
        }
        return null
      }).filter(Boolean) as { id: string; name: string; price_adjustment: number; modifier_type: string }[]
      const modTotal = mods.reduce((s, m) => s + m.price_adjustment, 0)
      return { item, qty, mods, lineTotal: ((item.price ?? 0) + modTotal) * qty }
    })

    return (
      <div className="min-h-dvh bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
            <button onClick={() => setView('menu')} className="text-sm font-medium text-gray-500 hover:text-gray-900 -ml-1 px-2 py-1.5">
              ← Back
            </button>
            <h1 className="text-base font-semibold text-gray-900">Review order</h1>
            <span className="w-14" />
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {lineItems.map(({ item, qty, mods, lineTotal }) => (
              <div key={item.id} className="px-4 py-3.5 flex justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  <span className="text-sm text-gray-400 pt-0.5 tabular-nums">{qty}x</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {mods.map((m) => (
                      <p key={m.id} className="text-xs text-gray-400 mt-0.5">
                        {m.modifier_type === 'remove' ? '− ' : '+ '}{m.name}
                        {m.price_adjustment > 0 && ` · $${m.price_adjustment.toFixed(2)}`}
                      </p>
                    ))}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 tabular-nums whitespace-nowrap pt-0.5">
                  ${lineTotal.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="px-4 py-3.5 flex justify-between">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4 space-y-4">
            {venue.customer_id_label && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  {venue.customer_id_label} {venue.customer_id_required && <span className="text-red-400">*</span>}
                </label>
                <input
                  className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-shadow"
                  placeholder="e.g. 1042"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </div>
            )}

            {venue.allow_pickup && venue.allow_delivery && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Fulfillment</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pickup', 'delivery'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFulfillment(opt)}
                      className={`h-11 rounded-xl text-sm font-medium transition-all ${
                        fulfillment === opt
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {opt === 'pickup' ? 'Pickup' : 'Delivery'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fulfillment === 'delivery' && venue.allow_delivery && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Deliver to</label>
                <input
                  className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-shadow"
                  placeholder={venue.delivery_location_placeholder || 'e.g. Hole 7, Table 3'}
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                />
              </div>
            )}

            {venue.allow_notes && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-shadow resize-none"
                  rows={2}
                  placeholder="Special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="rounded-xl px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || (venue.customer_id_required && !customerId.trim())}
            className="w-full h-12 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity active:scale-[0.98]"
            style={{ background: ACCENT }}
          >
            {isPending ? 'Placing order...' : `Place order · $${cartTotal.toFixed(2)}`}
          </button>

          <div className="h-6" />
        </div>
      </div>
    )
  }

  /* ================================================================
     MENU
     ================================================================ */
  const filteredItems = activeCategory
    ? menuItems.filter((i) => i.category?.id === activeCategory)
    : menuItems.filter((i) => !i.category)
  const uncategorized = menuItems.filter((i) => !i.category)

  return (
    <div className="min-h-dvh bg-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3.5">
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{venue.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{cartDisplay}{venue.allow_delivery && ' · Delivery available'}</p>
        </div>
      </header>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="sticky top-[62px] z-20 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto flex gap-1 px-4 overflow-x-auto hide-scrollbar">
            {uncategorized.length > 0 && (
              <button
                onClick={() => setActiveCategory('')}
                className={`shrink-0 px-3.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  !activeCategory
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Other
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-3.5 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeCategory === cat.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {(activeCategory ? filteredItems : uncategorized).length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-20">Nothing here yet.</p>
        ) : (
          <div className="space-y-2">
            {(activeCategory ? filteredItems : uncategorized).map((item) => {
              const qty = cart[item.id] || 0
              const hasMods = item.modifier_groups.some((g) => g.options.length > 0)
              const isExpanded = expandedItem === item.id
              const allMods = item.modifier_groups.flatMap((g) =>
                g.options.map((o) => ({ ...o, groupName: g.name }))
              )

              return (
                <div key={item.id} className={`rounded-2xl border transition-shadow ${qty > 0 ? 'border-blue-200 shadow-sm shadow-blue-100/50' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3 p-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
                      )}
                      {item.price !== null && (
                        <p className="text-sm font-semibold text-gray-900 mt-1.5 tabular-nums">${item.price.toFixed(2)}</p>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                      {qty === 0 ? (
                        <button
                          onClick={() => { addItem(item); if (hasMods) setExpandedItem(item.id) }}
                          className="h-9 px-5 rounded-full text-sm font-medium text-white transition-opacity active:opacity-80"
                          style={{ background: ACCENT }}
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 bg-gray-100 rounded-full h-9 px-1">
                          <button onClick={() => removeItem(item)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 text-base font-medium">−</button>
                          <span className="text-sm font-semibold text-gray-900 tabular-nums w-4 text-center">{qty}</span>
                          <button onClick={() => addItem(item)} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-medium" style={{ background: ACCENT }}>+</button>
                        </div>
                      )}
                      {hasMods && qty > 0 && (
                        <button
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="text-xs font-medium px-2 py-0.5 transition-colors"
                          style={{ color: ACCENT }}
                        >
                          {isExpanded ? 'Done' : 'Customize'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  {hasMods && isExpanded && qty > 0 && (
                    <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2 border-t border-gray-100 mt-0">
                      {allMods.map((mod) => {
                        const checked = (selectedMods[item.id] || []).includes(mod.id)
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleMod(item.id, mod.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                              checked
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {checked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                            {mod.modifier_type === 'remove' && '− '}
                            {mod.name}
                            {mod.price_adjustment > 0 && (
                              <span className={checked ? 'text-gray-300' : 'text-gray-400'}>+${mod.price_adjustment.toFixed(2)}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="max-w-lg mx-auto px-4 pb-6 pt-3" style={{ background: 'linear-gradient(to top, white 70%, transparent)' }}>
            <button
              onClick={() => setView('review')}
              className="w-full h-14 rounded-2xl text-white font-semibold flex items-center justify-between px-5 shadow-lg active:scale-[0.98] transition-transform"
              style={{ background: ACCENT }}
            >
              <span className="text-sm opacity-80">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
              <span className="text-sm">Review · ${cartTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
