'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { BillingState, Venue, VenueTab } from '@/lib/supabase/types'
import { canUsePayments, hasFeature } from '@/lib/features'
import { updateWorkspaceSettings } from '@/app/actions/admin'
import { TabsManager } from './tabs-manager'

const BILLING_STATE_LABELS: Record<BillingState, string> = {
  house_account: 'House account',
  tab: 'Tab',
  complimentary: 'Complimentary',
  paid: 'Paid',
}

/** Matches the server-side cap in updateWorkspaceSettings. Kept in sync
 *  manually — if the server cap moves, move this with it. */
const ETA_MAX_MINUTES = 240

type WorkspaceSettingsProps = {
  venue: Venue
  tabs: VenueTab[]
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

export function WorkspaceSettings({ venue, tabs }: WorkspaceSettingsProps) {
  const customTabsOn = hasFeature(venue, 'custom_tabs')
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
  const [defaultSlackChannel, setDefaultSlackChannel] = useState(
    venue.default_slack_channel ?? ''
  )

  // Branding
  const [primaryColor, setPrimaryColor] = useState(venue.primary_color || '#1a1a1a')
  const [accentColor, setAccentColor] = useState(venue.accent_color || '#2563eb')
  const [logoUrl, setLogoUrl] = useState(venue.logo_url ?? '')

  // Payments (only meaningful when canUsePayments(venue) is true — otherwise
  // state is initialized but the section never renders and the values never
  // reach the server action).
  const paymentsVisible = canUsePayments(venue)
  const [paymentsEnabled, setPaymentsEnabled] = useState(venue.payments_enabled)
  const [stripeKeyInput, setStripeKeyInput] = useState('')

  // Order Page Copy — Editorial chassis fields (migration 00021). Each piece
  // of state mirrors a venue column 1:1. ETA is held as a string because
  // <input> values are strings and we want to preserve "" as "leave blank";
  // we convert at save time.
  const [tagline, setTagline] = useState(venue.tagline ?? '')
  const [locationSubhead, setLocationSubhead] = useState(venue.location_subhead ?? '')
  const [locationQuestionLabel, setLocationQuestionLabel] = useState(
    venue.location_question_label ?? '',
  )
  const [submitCtaLabel, setSubmitCtaLabel] = useState(venue.submit_cta_label)
  const [successHeadline, setSuccessHeadline] = useState(venue.success_headline)
  const [fulfillmentCopy, setFulfillmentCopy] = useState(venue.fulfillment_copy ?? '')
  const [etaInput, setEtaInput] = useState(
    venue.default_fulfillment_eta_minutes != null
      ? String(venue.default_fulfillment_eta_minutes)
      : '',
  )
  const [billingState, setBillingState] = useState<BillingState>(venue.billing_state)

  // Inline validation state. Populated only after a save attempt; cleared on
  // the next attempt or when the user types in the offending field. Showing
  // these always-on would nag the user before they've done anything wrong.
  const [requiredCtaError, setRequiredCtaError] = useState(false)
  const [requiredHeadlineError, setRequiredHeadlineError] = useState(false)
  const [etaError, setEtaError] = useState<string | null>(null)

  const handleSave = () => {
    setError(null)
    setSaved(false)
    // Reset inline validation state — the upcoming checks repopulate it.
    setRequiredCtaError(false)
    setRequiredHeadlineError(false)
    setEtaError(null)

    if (!allowPickup && !allowDelivery) {
      setError('At least one fulfillment option must be enabled.')
      return
    }

    // ── Order Page Copy validation. Set inline flags; if any fail, abort
    //    BEFORE the server action so the user sees per-field feedback in
    //    addition to the top-level error. ──
    let hasOrderCopyError = false
    if (!submitCtaLabel.trim()) {
      setRequiredCtaError(true)
      hasOrderCopyError = true
    }
    if (!successHeadline.trim()) {
      setRequiredHeadlineError(true)
      hasOrderCopyError = true
    }
    let etaValue: number | null = null
    if (etaInput.trim() !== '') {
      const n = Number(etaInput)
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > ETA_MAX_MINUTES) {
        setEtaError(`Must be a whole number between 1 and ${ETA_MAX_MINUTES}.`)
        hasOrderCopyError = true
      } else {
        etaValue = n
      }
    }
    if (hasOrderCopyError) {
      setError('Please fix the highlighted fields below.')
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
        default_slack_channel: defaultSlackChannel.trim() || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        logo_url: logoUrl.trim() || null,
        ...(paymentsVisible
          ? {
              payments_enabled: paymentsEnabled,
              ...(stripeKeyInput.trim() ? { stripe_secret_key: stripeKeyInput.trim() } : {}),
            }
          : {}),
        // Order Page Copy. Send '' as null for nullable text; send trimmed
        // values for the NOT NULL fields (already validated non-empty above).
        tagline: tagline.trim() || null,
        location_subhead: locationSubhead.trim() || null,
        location_question_label: locationQuestionLabel.trim() || null,
        submit_cta_label: submitCtaLabel.trim(),
        success_headline: successHeadline.trim(),
        fulfillment_copy: fulfillmentCopy.trim() || null,
        default_fulfillment_eta_minutes: etaValue,
        billing_state: billingState,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        // Clear the key input after a successful save so the "Key saved"
        // badge reappears and nothing lingers in the DOM.
        setStripeKeyInput('')
        router.refresh()
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {customTabsOn && <TabsManager venueId={venue.id} tabs={tabs} />}

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

      {/* Notifications */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500">
          Set a default Slack channel for request notifications. Individual
          requests can override this with their own channel.
        </p>
        <div>
          <label
            htmlFor="default-slack"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Default Slack Channel
          </label>
          <input
            id="default-slack"
            type="text"
            value={defaultSlackChannel}
            onChange={(e) => setDefaultSlackChannel(e.target.value)}
            placeholder="e.g. #orders"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h2 className="font-semibold text-gray-900">Branding</h2>
        <p className="text-sm text-gray-500">
          Customize the look of your customer-facing pages.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="accent-color" className="block text-sm font-medium text-gray-700 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="accent-color"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="logo-url" className="block text-sm font-medium text-gray-700 mb-1">
            Logo URL
          </label>
          <input
            id="logo-url"
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
          />
          {logoUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img src={logoUrl} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: primaryColor }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ background: accentColor }}>Aa</div>
          <span className="text-sm text-white font-medium">Preview</span>
        </div>
      </div>

      {/* Order Page Copy — Editorial chassis text. Three subsections mirror
          the chassis screens (Masthead / Cart / Confirmation) so an admin
          editing a field can mentally place where it shows up. */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Order Page Copy</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Text shown to customers on the order page. Each section below
            corresponds to a screen in the customer flow.
          </p>
        </div>

        {/* ── MASTHEAD ── */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Masthead
          </p>
          <div>
            <label htmlFor="copy-tagline" className="block text-sm font-medium text-gray-700 mb-1">
              Tagline
            </label>
            <input
              id="copy-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="EST. 1962"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Small text under the venue name in the order page header. Leave blank to hide.
            </p>
          </div>
          <div>
            <label htmlFor="copy-location-subhead" className="block text-sm font-medium text-gray-700 mb-1">
              Location subhead
            </label>
            <input
              id="copy-location-subhead"
              type="text"
              value={locationSubhead}
              onChange={(e) => setLocationSubhead(e.target.value)}
              placeholder="ON CART"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Label paired with the venue&apos;s location in the masthead. Leave blank to hide.
            </p>
          </div>
        </div>

        {/* ── CART SCREEN ── */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Cart screen
          </p>
          <div>
            <label htmlFor="copy-location-question" className="block text-sm font-medium text-gray-700 mb-1">
              Location question
            </label>
            <input
              id="copy-location-question"
              type="text"
              value={locationQuestionLabel}
              onChange={(e) => setLocationQuestionLabel(e.target.value)}
              placeholder="WHERE ON THE COURSE?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Question asked when a customer needs to tell you where they are.
              Leave blank to use the default &ldquo;Where are you?&rdquo;.
            </p>
          </div>
          <div>
            <label htmlFor="copy-submit-cta" className="block text-sm font-medium text-gray-700 mb-1">
              Submit button label
            </label>
            <input
              id="copy-submit-cta"
              type="text"
              value={submitCtaLabel}
              onChange={(e) => {
                setSubmitCtaLabel(e.target.value)
                if (requiredCtaError && e.target.value.trim()) setRequiredCtaError(false)
              }}
              placeholder="Submit Request"
              aria-invalid={requiredCtaError}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none ${
                requiredCtaError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-gray-900'
              }`}
            />
            {requiredCtaError ? (
              <p className="text-xs text-red-600 mt-1">Required.</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Text on the submit button at the bottom of the cart. Required.
              </p>
            )}
          </div>
        </div>

        {/* ── CONFIRMATION SCREEN ── */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Confirmation screen
          </p>
          <div>
            <label htmlFor="copy-success-headline" className="block text-sm font-medium text-gray-700 mb-1">
              Success headline
            </label>
            <input
              id="copy-success-headline"
              type="text"
              value={successHeadline}
              onChange={(e) => {
                setSuccessHeadline(e.target.value)
                if (requiredHeadlineError && e.target.value.trim()) setRequiredHeadlineError(false)
              }}
              placeholder="On its way."
              aria-invalid={requiredHeadlineError}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none ${
                requiredHeadlineError
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-gray-200 focus:border-gray-900'
              }`}
            />
            {requiredHeadlineError ? (
              <p className="text-xs text-red-600 mt-1">Required.</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Big headline on the confirmation screen after a successful order. Required.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="copy-fulfillment" className="block text-sm font-medium text-gray-700 mb-1">
              Fulfillment message
            </label>
            <textarea
              id="copy-fulfillment"
              value={fulfillmentCopy}
              onChange={(e) => setFulfillmentCopy(e.target.value)}
              placeholder="The beverage cart will meet you at the next tee."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sentence on the confirmation screen telling customers what happens
              next. Leave blank to use a generic message.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="copy-eta" className="block text-sm font-medium text-gray-700 mb-1">
                ETA (minutes)
              </label>
              <input
                id="copy-eta"
                type="number"
                inputMode="numeric"
                min={1}
                max={ETA_MAX_MINUTES}
                value={etaInput}
                onChange={(e) => {
                  setEtaInput(e.target.value)
                  if (etaError) setEtaError(null)
                }}
                placeholder="6"
                aria-invalid={etaError !== null}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none ${
                  etaError
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-gray-900'
                }`}
              />
              {etaError ? (
                <p className="text-xs text-red-600 mt-1">{etaError}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  If set, the confirmation adds &ldquo;Estimated arrival in
                  N minutes.&rdquo; Leave blank to hide.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="copy-billing-state" className="block text-sm font-medium text-gray-700 mb-1">
                Billing state
              </label>
              <select
                id="copy-billing-state"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value as BillingState)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-gray-900 focus:outline-none bg-white"
              >
                {(Object.keys(BILLING_STATE_LABELS) as BillingState[]).map((s) => (
                  <option key={s} value={s}>
                    {BILLING_STATE_LABELS[s]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Drives the closing line on the order confirmation receipt:
              </p>
              <ul className="text-xs text-gray-500 mt-1 ml-4 list-disc space-y-0.5">
                <li>House account → &ldquo;CHARGED TO {`{customer ID}`}&rdquo;</li>
                <li>Tab → &ldquo;TAB FOR {`{customer ID}`}&rdquo;</li>
                <li>Complimentary → italic &ldquo;complimentary&rdquo; instead of a total</li>
                <li>Paid → &ldquo;PAID&rdquo; (Stripe-charged venues)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Payments — full_commerce plan only. Completely hidden on pos_only. */}
      {paymentsVisible && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Payments</h2>
          <p className="text-sm text-gray-500">
            Connect your own Stripe account to accept payments at checkout.
            Promptly never touches the funds — charges go directly to your Stripe balance.
          </p>
          <Toggle
            label="Enable Payments"
            description="Customers will be redirected to Stripe Checkout on submit"
            checked={paymentsEnabled}
            onChange={setPaymentsEnabled}
          />
          <div>
            <label
              htmlFor="stripe-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Stripe Secret Key
            </label>
            <input
              id="stripe-key"
              type="password"
              autoComplete="off"
              value={stripeKeyInput}
              onChange={(e) => setStripeKeyInput(e.target.value)}
              placeholder={venue.hasStripeKey ? '••••••••••••••••' : 'sk_live_...'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none font-mono"
            />
            <div className="mt-2 flex items-center gap-2">
              {venue.hasStripeKey && !stripeKeyInput && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-xs text-green-700 font-medium">
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Key saved
                </span>
              )}
              <p className="text-xs text-gray-500">
                Leave blank to keep existing key. Paste a new key to replace.
              </p>
            </div>
          </div>
        </div>
      )}

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
          className="hover-btn px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
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
