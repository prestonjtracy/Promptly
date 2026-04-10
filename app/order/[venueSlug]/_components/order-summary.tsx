'use client'

import type {
  MenuItemWithModifiers,
  FulfillmentType,
  CartEntry,
} from '@/lib/supabase/types'

type OrderSummaryProps = {
  cart: CartEntry[]
  menuItems: MenuItemWithModifiers[]
  fulfillment: FulfillmentType
  deliveryLocation: string
  customerIdLabel: string | null
  customerIdValue: string
  notes: string
  onEntryQuantityChange: (cartKey: string, newQty: number) => void
}

export function OrderSummary({
  cart,
  menuItems,
  fulfillment,
  deliveryLocation,
  customerIdLabel,
  customerIdValue,
  notes,
  onEntryQuantityChange,
}: OrderSummaryProps) {
  if (cart.length === 0) return null

  let total = 0
  let hasAnyPrice = false

  const entries = cart.map((entry) => {
    const item = menuItems.find((mi) => mi.id === entry.menuItemId)
    if (!item) return null

    const modifierTotal = entry.selectedModifiers.reduce(
      (s, m) => s + m.price_adjustment,
      0
    )
    const unitPrice =
      item.price !== null ? item.price + modifierTotal : null
    const lineTotal = unitPrice !== null ? unitPrice * entry.quantity : null

    if (lineTotal !== null) {
      total += lineTotal
      hasAnyPrice = true
    }

    return { entry, item, unitPrice, lineTotal }
  })

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Summary</h3>

      <ul className="space-y-3">
        {entries.map((e) => {
          if (!e) return null
          const { entry, item, lineTotal } = e
          const hasModifiers = entry.selectedModifiers.length > 0

          return (
            <li key={entry.cartKey} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name}{' '}
                  <span className="text-gray-400">x{entry.quantity}</span>
                </span>
                <div className="flex items-center gap-2">
                  {lineTotal !== null && (
                    <span className="text-gray-700">
                      ${lineTotal.toFixed(2)}
                    </span>
                  )}
                  {/* Per-entry +/- for items with modifiers */}
                  {hasModifiers && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onEntryQuantityChange(
                            entry.cartKey,
                            entry.quantity - 1
                          )
                        }
                        className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-300"
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onEntryQuantityChange(
                            entry.cartKey,
                            entry.quantity + 1
                          )
                        }
                        className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-300"
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {hasModifiers && (
                <ul className="ml-3 space-y-0.5">
                  {entry.selectedModifiers.map((mod) => (
                    <li
                      key={mod.option_id}
                      className={`text-xs ${mod.modifier_type === 'remove' ? 'text-red-400' : 'text-gray-500'}`}
                    >
                      {mod.modifier_type === 'remove' ? '− ' : '+ '}
                      {mod.option_name}
                      {mod.modifier_type === 'add' &&
                        mod.price_adjustment > 0 &&
                        ` ($${mod.price_adjustment.toFixed(2)})`}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {hasAnyPrice && (
        <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-sm">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">${total.toFixed(2)}</span>
        </div>
      )}

      <div className="border-t border-gray-200 pt-2 space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Fulfillment</span>
          <span className="capitalize">{fulfillment}</span>
        </div>
        {fulfillment === 'delivery' && deliveryLocation && (
          <div className="flex justify-between">
            <span>Deliver to</span>
            <span className="text-gray-700">{deliveryLocation}</span>
          </div>
        )}
        {customerIdLabel && customerIdValue && (
          <div className="flex justify-between">
            <span>{customerIdLabel}</span>
            <span>{customerIdValue}</span>
          </div>
        )}
        {notes && (
          <div>
            <span className="block text-gray-500">Notes:</span>
            <span className="text-gray-700">{notes}</span>
          </div>
        )}
      </div>
    </div>
  )
}
