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
  const accent = venue.primary_color || '#1a3d2b'

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

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find((i) => i.id === id)
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
          const item = menuItems.find((i) => i.id === id)!
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

  // ── shared ──
  const BG = '#F8F7F5'
  const inter = 'var(--font-inter), system-ui, -apple-system, sans-serif'

  /* ================================================================
     CONFIRMATION
     ================================================================ */
  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: BG, fontFamily: inter }}>
        <div className="max-w-sm w-full text-center py-16">
          <div
            className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${accent}12` }}
          >
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={accent}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight mb-3">Order received</h1>
          <p className="text-[15px] text-gray-500 leading-relaxed mb-2">
            {fulfillment === 'delivery' && deliveryLocation
              ? `We'll deliver your order to ${deliveryLocation}.`
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
      const item = menuItems.find((i) => i.id === id)!
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
      <div className="min-h-dvh" style={{ background: BG, fontFamily: inter }}>
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ background: `${BG}ee` }}>
          <div className="max-w-lg mx-auto flex items-center justify-between px-5 h-16">
            <button
              onClick={() => setView('menu')}
              className="flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors -ml-2 px-2 py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </button>
            <h1 className="text-[15px] font-semibold text-gray-900">Review order</h1>
            <span className="w-14" />
          </div>
        </header>

        <div className="max-w-lg mx-auto px-5 pb-10 space-y-5">
          {/* Items card */}
          <div className="bg-white rounded-2xl shadow-sm shadow-black/[0.04] overflow-hidden">
            {lineItems.map(({ item, qty, mods, lineTotal }, idx) => (
              <div key={item.id} className={`px-5 py-4 flex justify-between gap-4 ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex gap-3.5 min-w-0">
                  <span className="text-[13px] font-medium text-gray-400 pt-0.5 tabular-nums shrink-0">{qty}x</span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">{item.name}</p>
                    {mods.map((m) => (
                      <p key={m.id} className="text-[12px] text-gray-400 mt-1 leading-tight">
                        {m.modifier_type === 'remove' ? '− ' : '+ '}{m.name}
                        {m.price_adjustment > 0 && <span className="ml-1 text-gray-300">+${m.price_adjustment.toFixed(2)}</span>}
                      </p>
                    ))}
                  </div>
                </div>
                <span className="text-[15px] font-semibold text-gray-900 tabular-nums whitespace-nowrap pt-0.5">${lineTotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 px-5 py-4 flex justify-between items-center">
              <span className="text-[15px] font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold tabular-nums" style={{ color: accent }}>${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm shadow-black/[0.04] px-5 py-5 space-y-5">
            {venue.customer_id_label && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">
                  {venue.customer_id_label} {venue.customer_id_required && <span className="text-red-400">*</span>}
                </label>
                <input
                  className="w-full h-12 px-4 bg-[#F8F7F5] border-0 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition-shadow focus:ring-2 focus:ring-offset-1"
                  style={{ '--tw-ring-color': `${accent}33` } as React.CSSProperties}
                  placeholder="e.g. 1042"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </div>
            )}

            {venue.allow_pickup && venue.allow_delivery && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">Fulfillment</label>
                <div className="flex gap-2 p-1 bg-[#F8F7F5] rounded-xl">
                  {(['pickup', 'delivery'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFulfillment(opt)}
                      className={`flex-1 h-10 rounded-lg text-[13px] font-semibold transition-all ${
                        fulfillment === opt
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-400'
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
                <label className="block text-[12px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">Deliver to</label>
                <input
                  className="w-full h-12 px-4 bg-[#F8F7F5] border-0 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition-shadow focus:ring-2 focus:ring-offset-1"
                  style={{ '--tw-ring-color': `${accent}33` } as React.CSSProperties}
                  placeholder={venue.delivery_location_placeholder || 'e.g. Hole 7, Table 3'}
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                />
              </div>
            )}

            {venue.allow_notes && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">Notes</label>
                <textarea
                  className="w-full px-4 py-3 bg-[#F8F7F5] border-0 rounded-xl text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition-shadow resize-none focus:ring-2 focus:ring-offset-1"
                  style={{ '--tw-ring-color': `${accent}33` } as React.CSSProperties}
                  rows={2}
                  placeholder="Special requests..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="rounded-2xl px-5 py-3.5 bg-red-50 text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending || (venue.customer_id_required && !customerId.trim())}
            className="w-full h-[52px] rounded-full text-white text-[15px] font-semibold disabled:opacity-40 transition-all active:scale-[0.98]"
            style={{ background: accent }}
          >
            {isPending ? 'Placing order...' : `Place order · $${cartTotal.toFixed(2)}`}
          </button>
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
    <div className="min-h-dvh pb-32" style={{ background: BG, fontFamily: inter }}>
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ background: `${BG}ee` }}>
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center gap-3.5">
            {venue.logo_url ? (
              <img
                src={venue.logo_url}
                alt={venue.name}
                className="w-11 h-11 rounded-2xl object-cover shrink-0"
              />
            ) : null}
            <div>
              <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">{venue.name}</h1>
              <p className="text-[13px] text-gray-400 mt-0.5">{cartDisplay}{venue.allow_delivery && ' · Delivery available'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="sticky top-[76px] z-20 backdrop-blur-xl" style={{ background: `${BG}ee` }}>
          <div className="max-w-lg mx-auto px-5 py-2.5 flex gap-2 overflow-x-auto hide-scrollbar">
            {uncategorized.length > 0 && (
              <button
                onClick={() => setActiveCategory('')}
                className="hover-darken shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all"
                style={
                  !activeCategory
                    ? { background: accent, color: '#fff' }
                    : { background: 'white', color: '#9ca3af', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }
                }
              >
                Other
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="hover-darken shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all"
                style={
                  activeCategory === cat.id
                    ? { background: accent, color: '#fff' }
                    : { background: 'white', color: '#9ca3af', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="max-w-lg mx-auto px-5 pt-3">
        {(activeCategory ? filteredItems : uncategorized).length === 0 ? (
          <p className="text-center text-gray-400 text-[13px] py-24">Nothing here yet.</p>
        ) : (
          <div className="space-y-3">
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
                  className="bg-white rounded-2xl shadow-sm shadow-black/[0.04] overflow-hidden card-hover"
                >
                  <div className="p-5 flex items-start gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-bold text-gray-900 tracking-tight">{item.name}</p>
                      {item.description && (
                        <p className="text-[13px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                      )}
                      {item.price !== null && (
                        <p className="text-[15px] font-bold text-gray-900 mt-2.5 tabular-nums">${item.price.toFixed(2)}</p>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                      {qty === 0 ? (
                        <button
                          onClick={() => { addItem(item); if (hasMods) setExpandedItem(item.id) }}
                          className="hover-darken h-10 px-6 rounded-full text-[13px] font-semibold text-white transition-all active:scale-95"
                          style={{ background: accent }}
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center h-10 rounded-full overflow-hidden" style={{ background: `${accent}0a` }}>
                          <button
                            onClick={() => removeItem(item)}
                            className="hover-darken w-10 h-10 flex items-center justify-center text-[18px] font-medium transition-colors hover:bg-black/[0.03]"
                            style={{ color: accent }}
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-[14px] font-bold text-gray-900 tabular-nums">{qty}</span>
                          <button
                            onClick={() => addItem(item)}
                            className="hover-darken w-10 h-10 flex items-center justify-center text-[18px] font-medium transition-colors hover:bg-black/[0.03]"
                            style={{ color: accent }}
                          >
                            +
                          </button>
                        </div>
                      )}
                      {hasMods && qty > 0 && (
                        <button
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="hover-darken text-[12px] font-semibold transition-colors"
                          style={{ color: accent }}
                        >
                          {isExpanded ? 'Done' : 'Customize'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Modifiers */}
                  {hasMods && isExpanded && qty > 0 && (
                    <div className="px-5 pb-5 pt-0 flex flex-wrap gap-2 border-t border-gray-100 mt-0 pt-4">
                      {allMods.map((mod) => {
                        const checked = (selectedMods[item.id] || []).includes(mod.id)
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleMod(item.id, mod.id)}
                            className="hover-darken inline-flex items-center gap-1.5 h-9 rounded-full px-4 text-[12px] font-semibold transition-all"
                            style={
                              checked
                                ? { background: accent, color: '#fff' }
                                : { background: '#F8F7F5', color: '#6b7280' }
                            }
                          >
                            {checked && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                            {mod.modifier_type === 'remove' && '− '}
                            {mod.name}
                            {mod.price_adjustment > 0 && (
                              <span style={{ opacity: checked ? 0.7 : 0.5 }}>+${mod.price_adjustment.toFixed(2)}</span>
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
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
          <div className="max-w-lg mx-auto px-5 pb-8 pt-4 pointer-events-auto" style={{ background: `linear-gradient(to top, ${BG} 60%, transparent)` }}>
            <button
              onClick={() => setView('review')}
              className="hover-darken w-full h-[56px] rounded-full text-white font-semibold flex items-center justify-between px-6 shadow-lg shadow-black/10 active:scale-[0.98] transition-transform"
              style={{ background: '#2563EB' }}
            >
              <span className="text-[14px] opacity-70">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
              <span className="text-[14px] font-bold">Review · ${cartTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
