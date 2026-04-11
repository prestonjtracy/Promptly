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
  if (!allowPickup || !allowDelivery) return null

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
        Fulfillment
      </label>
      <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => onChange('pickup')}
          className={`hover-btn py-3 rounded-lg text-sm font-semibold ${
            value === 'pickup'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400'
          }`}
        >
          Pickup
        </button>
        <button
          type="button"
          onClick={() => onChange('delivery')}
          className={`hover-btn py-3 rounded-lg text-sm font-semibold ${
            value === 'delivery'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-400'
          }`}
        >
          Delivery
        </button>
      </div>
    </div>
  )
}
