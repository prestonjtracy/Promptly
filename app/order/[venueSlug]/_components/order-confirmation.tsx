'use client'

import type { Venue, Location } from '@/lib/supabase/types'

type OrderConfirmationProps = {
  venue: Venue
  location: Location
  orderNumber?: number
  onNewOrder: () => void
}

export function OrderConfirmation({
  venue,
  location,
  orderNumber,
  onNewOrder,
}: OrderConfirmationProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        {orderNumber && (
          <p className="text-sm font-medium text-gray-400 mb-2">
            Order #{orderNumber}
          </p>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Request Submitted!
        </h1>
        <p className="text-gray-600 mb-1">
          The team at <strong>{venue.name}</strong> has been notified.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          {venue.location_type_label}: {location.name}
        </p>

        <button
          onClick={onNewOrder}
          className="px-6 py-3 bg-[var(--venue-accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Place Another Request
        </button>
      </div>
    </div>
  )
}
