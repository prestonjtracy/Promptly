'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Venue } from '@/lib/supabase/types'
import { updateWorkspaceSettings } from '@/app/actions/admin'

type WorkspaceSettingsProps = {
  venue: Venue
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative shrink-0 w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-gray-900' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  )
}

export function WorkspaceSettings({ venue }: WorkspaceSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [allowPickup, setAllowPickup] = useState(venue.allow_pickup)
  const [allowDelivery, setAllowDelivery] = useState(venue.allow_delivery)
  const [deliveryPlaceholder, setDeliveryPlaceholder] = useState(
    venue.delivery_location_placeholder ?? ''
  )

  const [customerIdLabel, setCustomerIdLabel] = useState(
    venue.customer_id_label ?? ''
  )
  const [customerIdRequired, setCustomerIdRequired] = useState(
    venue.customer_id_required
  )

  const [allowNotes, setAllowNotes] = useState(venue.allow_notes)

  const handleSave = () => {
    setError(null)
    setSaved(false)

    if (!allowPickup && !allowDelivery) {
      setError('At least one fulfillment option must be enabled.')
      return
    }

    startTransition(async () => {
      const result = await updateWorkspaceSettings(venue.id, {
        allow_pickup: allowPickup,
        allow_delivery: allowDelivery,
        customer_id_label: customerIdLabel.trim() || null,
        customer_id_required: customerIdLabel.trim()
          ? customerIdRequired
          : false,
        allow_notes: allowNotes,
        delivery_location_placeholder: deliveryPlaceholder.trim() || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Delivery & Pickup */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Delivery & Pickup</h2>
        <div className="space-y-3">
          <Toggle
            label="Pickup"
            description="Customers can pick up their request"
            checked={allowPickup}
            onChange={setAllowPickup}
          />
          <Toggle
            label="Delivery"
            description="Staff delivers to the customer's location"
            checked={allowDelivery}
            onChange={setAllowDelivery}
          />
          {allowDelivery && (
            <div className="ml-13 pl-[52px]">
              <label
                htmlFor="delivery-placeholder"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Delivery location placeholder
              </label>
              <input
                id="delivery-placeholder"
                type="text"
                value={deliveryPlaceholder}
                onChange={(e) => setDeliveryPlaceholder(e.target.value)}
                placeholder='Default: "Hole 7", "Poolside chair 3"...'
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Customer Identifier */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Customer Identifier</h2>
        <p className="text-sm text-gray-500">
          Ask customers for an identifier like a member number, room number, or seat number.
          Leave the label blank to hide this field.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="id-label"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Label
            </label>
            <input
              id="id-label"
              type="text"
              value={customerIdLabel}
              onChange={(e) => setCustomerIdLabel(e.target.value)}
              placeholder='e.g. "Member #", "Room #", "Tab #"'
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
          </div>
          {customerIdLabel.trim() && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customerIdRequired}
                onChange={(e) => setCustomerIdRequired(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">
                Require customers to fill this in
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Customer Notes */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Customer Notes</h2>
        <Toggle
          label="Allow notes"
          description="Let customers add special requests or notes"
          checked={allowNotes}
          onChange={setAllowNotes}
        />
      </div>

      {/* Save */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
      </div>

      {/* Business Info (read-only) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">Business Info</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Name</span>
            <p className="text-gray-900 font-medium">{venue.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Slug</span>
            <p className="text-gray-900 font-medium">{venue.slug}</p>
          </div>
          <div>
            <span className="text-gray-500">Location Label</span>
            <p className="text-gray-900 font-medium">
              {venue.location_type_label}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
