import Link from 'next/link'
import { notFound } from 'next/navigation'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptStripeKey } from '@/lib/crypto/stripe-key'
import { submitOrder } from '@/app/actions/submit-order'
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
    .select('id, slug, name, primary_color, accent_color, stripe_secret_key')
    .eq('slug', venueSlug)
    .single()

  if (!venueRow) notFound()
  const venue = venueRow as {
    id: string
    slug: string
    name: string
    primary_color: string
    accent_color: string
    stripe_secret_key: string | null
  }
  if (!venue.stripe_secret_key) notFound()

  let session: Stripe.Checkout.Session
  try {
    // Decrypt at the latest possible moment; plaintext key only lives in
    // this stack frame for the retrieve call.
    const stripe = new Stripe(decryptStripeKey(venue.stripe_secret_key))
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
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
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
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment not complete</h1>
        <p className="text-gray-600 mb-1">Your checkout session hasn&apos;t been paid yet.</p>
      </ConfirmationFrame>
    )
  }

  // Rehydrate the cart and persist the order. submitOrder is idempotent on
  // stripe_session_id, so page refresh returns the existing order number
  // without creating duplicates or re-firing Slack.
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

  return (
    <ConfirmationFrame
      venueName={venue.name}
      slug={venue.slug}
      primaryColor={venue.primary_color}
      accentColor={venue.accent_color}
    >
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      {result.success && result.orderNumber && (
        <p className="text-sm font-medium text-gray-400 mb-2">
          Order #{result.orderNumber}
        </p>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received!</h1>
      <p className="text-gray-600 mb-1">
        {result.success
          ? 'Your request has been sent to the team.'
          : 'Payment went through — please show this screen to staff.'}
      </p>
    </ConfirmationFrame>
  )
}
