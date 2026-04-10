'use client'

import type { FulfillmentType } from '@/lib/supabase/types'

type FulfillmentToggleProps = {
  value: FulfillmentType
  onChange: (value: FulfillmentType) => void
  allowPickup: boolean
  allowDelivery: boolean
}

export function FulfillmentToggle({
  value,
  onChange,
  allowPickup,
  allowDelivery,
}: FulfillmentToggleProps) {
  // If only one option available, don't render a toggle
  if (!allowPickup || !allowDelivery) return null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        How would you like your order?
      </label>
      <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onChange('pickup')}
          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
            value === 'pickup'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏃 Pickup
        </button>
        <button
          type="button"
          onClick={() => onChange('delivery')}
          className={`py-3 rounded-lg text-sm font-semibold transition-all ${
            value === 'delivery'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📍 Delivery
        </button>
      </div>
    </div>
  )
}
