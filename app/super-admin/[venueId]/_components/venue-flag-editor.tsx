'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { VenueFeatures } from '@/lib/supabase/types'
import { updateVenueFlag, updateVenueTier } from '@/app/actions/super-admin'
import { PLATFORM_FLAGS, PLATFORM_TIERS } from '@/lib/super-admin/platform-config'

type Props = {
  venueId: string
  initialFeatures: VenueFeatures
  initialTier: string
}

export function VenueFlagEditor({ venueId, initialFeatures, initialTier }: Props) {
  const router = useRouter()
  const [features, setFeatures] = useState<VenueFeatures>(initialFeatures)
  const [tier, setTier] = useState(initialTier)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const handleToggleFlag = (key: keyof VenueFeatures, next: boolean) => {
    // Optimistic: update local state first, revert on error. Keeps the toggle
    // responsive for the platform owner who is flipping many flags at once.
    const prev = features
    setFeatures({ ...features, [key]: next })
    setError(null)
    setStatus(null)

    startTransition(async () => {
      const result = await updateVenueFlag(venueId, key, next)
      if (result.error) {
        setFeatures(prev)
        setError(result.error)
      } else {
        setStatus(`${key} set to ${next ? 'on' : 'off'}.`)
        router.refresh()
        setTimeout(() => setStatus(null), 1500)
      }
    })
  }

  const handleTierChange = (next: string) => {
    const prev = tier
    setTier(next)
    setError(null)
    setStatus(null)

    startTransition(async () => {
      const result = await updateVenueTier(venueId, next)
      if (result.error) {
        setTier(prev)
        setError(result.error)
      } else {
        setStatus(`Tier set to ${next}.`)
        router.refresh()
        setTimeout(() => setStatus(null), 1500)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Tier */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">Tier</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Platform label only — no automatic flag changes are wired to it yet.
          </p>
        </div>
        <select
          value={tier}
          onChange={(e) => handleTierChange(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-gray-900 focus:outline-none bg-white disabled:opacity-50"
        >
          {PLATFORM_TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {/* If the DB somehow has a tier outside the known list, show it so
              it can still be seen and explicitly reassigned. */}
          {!(PLATFORM_TIERS as readonly string[]).includes(tier) && (
            <option value={tier}>{tier} (unknown)</option>
          )}
        </select>
      </section>

      {/* Flags */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Feature Flags</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Entitlements for this venue. Changes save immediately.
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {PLATFORM_FLAGS.map((flag) => {
            const checked = features[flag.key] === true
            return (
              <div key={flag.key} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  disabled={isPending}
                  onClick={() => handleToggleFlag(flag.key, !checked)}
                  className={`mt-0.5 relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${
                    checked ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {flag.label}{' '}
                    <span className="ml-1 text-xs font-mono text-gray-400">
                      {flag.key}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Status / error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
          {status}
        </div>
      )}
    </div>
  )
}
