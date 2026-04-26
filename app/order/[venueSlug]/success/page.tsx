import Link from 'next/link'
import { notFound } from 'next/navigation'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptStripeKey } from '@/lib/crypto/stripe-key'
import { submitOrder } from '@/app/actions/submit-order'
import {
  handleFailedOrder,
  lookupPaymentFailure,
} from '@/lib/payments/handle-failed-order'
import type { FulfillmentType, SelectedModifier } from '@/lib/supabase/types'

export const metadata = {
  title: 'Payment Confirmed — Promptly',
}

type SuccessPageProps = {
  params: Promise<{ venueSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

type CartEntryMeta = {
  menu_item_id: string
  quantity: number
  selected_modifiers: SelectedModifier[]
}

type VenueRow = {
  id: string
  slug: string
  name: string
  primary_color: string
  accent_color: string
  stripe_secret_key: string | null
  default_slack_channel: string | null
}

function ConfirmationFrame({
  venueName,
  primaryColor,
  accentColor,
  children,
  slug,
  backLabel = 'Place Another Request',
}: {
  venueName: string
  primaryColor: string
  accentColor: string
  children: React.ReactNode
  slug: string
  backLabel?: string
}) {
  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
      style={
        {
          '--venue-primary': primaryColor,
          '--venue-accent': accentColor,
        } as React.CSSProperties
      }
    >
      <div className="text-center max-w-sm">
        {children}
        <p className="text-gray-600 mb-8">
          <strong>{venueName}</strong>
        </p>
        <Link
          href={`/order/${slug}`}
          className="hover-btn inline-block px-6 py-3 bg-[var(--venue-accent)] text-white rounded-lg font-medium"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  )
}

// ── Render helpers — one per terminal state ─────────────────────

function SuccessIcon() {
  return (
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
  )
}

function WarningIcon() {
  return (
    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
      </svg>
    </div>
  )
}

function ErrorIcon() {
  return (
    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  )
}

function renderSuccess(venue: VenueRow, orderNumber: number | null) {
  return (
    <ConfirmationFrame
      venueName={venue.name}
      slug={venue.slug}
      primaryColor={venue.primary_color}
      accentColor={venue.accent_color}
    >
      <SuccessIcon />
      {orderNumber !== null && (
        <p className="text-sm font-medium text-gray-400 mb-2">
          Order #{orderNumber}
        </p>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received!</h1>
      <p className="text-gray-600 mb-1">Your request has been sent to the team.</p>
    </ConfirmationFrame>
  )
}

function renderRefunded(venue: VenueRow) {
  return (
    <ConfirmationFrame
      venueName={venue.name}
      slug={venue.slug}
      primaryColor={venue.primary_color}
      accentColor={venue.accent_color}
      backLabel="Back to menu"
    >
      <WarningIcon />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Order couldn&apos;t be placed — payment refunded
      </h1>
      <p className="text-gray-600 mb-1">
        We hit an error setting up your order, so we automatically refunded your payment.
      </p>
      <p className="text-gray-500 text-sm mb-6">
        Refunds typically appear in your account within 5–10 business days. If you don&apos;t
        see it after that, contact <strong>{venue.name}</strong> with this page open and they
        can look up the transaction.
      </p>
    </ConfirmationFrame>
  )
}

function renderStuck(venue: VenueRow) {
  return (
    <ConfirmationFrame
      venueName={venue.name}
      slug={venue.slug}
      primaryColor={venue.primary_color}
      accentColor={venue.accent_color}
      backLabel="Back to menu"
    >
      <ErrorIcon />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Payment received — order setup failed
      </h1>
      <p className="text-gray-600 mb-1">
        We charged your card but couldn&apos;t place the order, and the automatic refund did
        not go through. Staff have been notified.
      </p>
      <p className="text-gray-500 text-sm mb-6">
        Please contact <strong>{venue.name}</strong> directly with this page open. They can
        look up your transaction and arrange a manual refund or fulfill your request.
      </p>
    </ConfirmationFrame>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default async function OrderSuccessPage(props: SuccessPageProps) {
  const { venueSlug } = await props.params
  const searchParams = await props.searchParams
  const sessionId = typeof searchParams.session_id === 'string' ? searchParams.session_id : null

  if (!sessionId) {
    notFound()
  }

  const supabase = createServiceClient()

  const { data: venueRow } = await supabase
    .from('venues')
    .select('id, slug, name, primary_color, accent_color, stripe_secret_key, default_slack_channel')
    .eq('slug', venueSlug)
    .single()

  if (!venueRow) notFound()
  const venue = venueRow as VenueRow
  if (!venue.stripe_secret_key) notFound()

  // ── Stripe session retrieve (decrypt key, ask Stripe) ─────────
  let session: Stripe.Checkout.Session
  let stripe: Stripe
  try {
    stripe = new Stripe(decryptStripeKey(venue.stripe_secret_key))
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    console.error('[Success] stripe retrieve failed', err instanceof Error ? err.message : 'unknown')
    return (
      <ConfirmationFrame
        venueName={venue.name}
        slug={venue.slug}
        primaryColor={venue.primary_color}
        accentColor={venue.accent_color}
        backLabel="Back to menu"
      >
        <ErrorIcon />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to confirm payment</h1>
        <p className="text-gray-600 mb-1">We couldn&apos;t look up your checkout session.</p>
      </ConfirmationFrame>
    )
  }

  // Guard: session must belong to this venue and actually be paid.
  if (session.metadata?.venue_id !== venue.id || session.payment_status !== 'paid') {
    return (
      <ConfirmationFrame
        venueName={venue.name}
        slug={venue.slug}
        primaryColor={venue.primary_color}
        accentColor={venue.accent_color}
        backLabel="Back to menu"
      >
        <WarningIcon />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment not complete</h1>
        <p className="text-gray-600 mb-1">Your checkout session hasn&apos;t been paid yet.</p>
      </ConfirmationFrame>
    )
  }

  // ── State A: a prior page-load already handled a failure for this
  //    session. Render the appropriate post-failure UI without re-running
  //    submitOrder or re-attempting any refund. The helper guards against
  //    races (PK + Stripe idempotency_key) but checking here saves a Stripe
  //    round-trip on the common refresh case.
  const priorFailure = await lookupPaymentFailure(session.id)
  if (priorFailure) {
    return priorFailure.refund_status === 'failed'
      ? renderStuck(venue)
      : renderRefunded(venue)
  }

  // ── State B: try to create the order. submitOrder is idempotent on
  //    stripe_session_id, so a refresh after a SUCCESSFUL prior run
  //    returns the existing order_number without re-firing Slack.
  let cart: CartEntryMeta[]
  try {
    cart = JSON.parse(session.metadata?.cart ?? '[]') as CartEntryMeta[]
  } catch {
    cart = []
  }

  const result = await submitOrder({
    venue_id: venue.id,
    location_id: session.metadata?.location_id ?? '',
    fulfillment: (session.metadata?.fulfillment as FulfillmentType) ?? 'pickup',
    delivery_location: session.metadata?.delivery_location || null,
    customer_id_value: session.metadata?.customer_id_value || null,
    notes: session.metadata?.notes || null,
    items: cart,
    stripe_session_id: session.id,
  })

  if (result.success) {
    return renderSuccess(venue, result.orderNumber ?? null)
  }

  // Race guard: between submitOrder's idempotency check and its insert, a
  // concurrent request for the same session may have already created the
  // order — our insert then fails on the UNIQUE constraint and we get
  // back result.error. Re-check before refunding so we don't refund a
  // payment that successfully produced an order on the other tab.
  const { data: raceCheck } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('stripe_session_id', session.id)
    .maybeSingle()
  if (raceCheck) {
    const order = raceCheck as { id: string; order_number: number }
    return renderSuccess(venue, order.order_number)
  }

  // ── State C: order setup failed AFTER a successful payment. Issue an
  //    automatic refund, persist the audit row, and (if the refund itself
  //    fails) alert the venue. handleFailedOrder is internally idempotent.
  const outcome = await handleFailedOrder({
    stripe,
    session,
    venueId: venue.id,
    alertSlackChannel: venue.default_slack_channel,
    failureReason: result.error ?? 'Unknown order setup error',
  })

  if (outcome.status === 'refunded') return renderRefunded(venue)
  if (outcome.status === 'already_handled') {
    return outcome.row.refund_status === 'failed'
      ? renderStuck(venue)
      : renderRefunded(venue)
  }
  // outcome.status === 'refund_failed'
  return renderStuck(venue)
}
