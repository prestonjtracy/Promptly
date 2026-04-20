import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type { FulfillmentType, SelectedModifier } from '@/lib/supabase/types'

type CheckoutRequest = {
  venueSlug: string
  locationId: string
  cart: {
    menu_item_id: string
    quantity: number
    selected_modifiers: SelectedModifier[]
  }[]
  fulfillment: FulfillmentType
  deliveryLocation: string | null
  customerIdValue: string | null
  notes: string | null
}

const PAYMENTS_NOT_CONFIGURED = 'Payments not configured for this business'

export async function POST(req: Request) {
  let body: CheckoutRequest
  try {
    body = (await req.json()) as CheckoutRequest
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.venueSlug || !body.locationId || !Array.isArray(body.cart) || body.cart.length === 0) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Service-role client: needs to read stripe_secret_key (REVOKEd from anon)
  // and treats the customer order page as untrusted input.
  const supabase = createServiceClient()

  const { data: venueRow, error: venueErr } = await supabase
    .from('venues')
    .select('id, slug, name, plan_type, payments_enabled, stripe_secret_key')
    .eq('slug', body.venueSlug)
    .single()

  if (venueErr || !venueRow) {
    return Response.json({ error: PAYMENTS_NOT_CONFIGURED }, { status: 400 })
  }

  const venue = venueRow as {
    id: string
    slug: string
    name: string
    plan_type: string
    payments_enabled: boolean
    stripe_secret_key: string | null
  }

  if (
    venue.plan_type !== 'full_commerce' ||
    !venue.payments_enabled ||
    !venue.stripe_secret_key
  ) {
    return Response.json({ error: PAYMENTS_NOT_CONFIGURED }, { status: 400 })
  }

  // Recompute line-item prices from the DB — never trust client-supplied
  // amounts. The client only sends menu_item_id + modifier metadata.
  const menuItemIds = Array.from(new Set(body.cart.map((c) => c.menu_item_id)))
  const { data: menuItemRows } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('venue_id', venue.id)
    .in('id', menuItemIds)

  const itemsById = new Map<string, { name: string; price: number | null }>()
  for (const row of (menuItemRows ?? []) as { id: string; name: string; price: number | null }[]) {
    itemsById.set(row.id, { name: row.name, price: row.price })
  }

  const lineItems: {
    quantity: number
    price_data: {
      currency: string
      unit_amount: number
      product_data: { name: string; description?: string }
    }
  }[] = []
  for (const entry of body.cart) {
    const menuItem = itemsById.get(entry.menu_item_id)
    if (!menuItem) {
      return Response.json(
        { error: 'One of the items is no longer available. Please refresh and try again.' },
        { status: 400 }
      )
    }
    const basePrice = menuItem.price ?? 0
    const modifierTotal = (entry.selected_modifiers ?? [])
      .filter((m) => m.modifier_type !== 'remove')
      .reduce((sum, m) => sum + (m.price_adjustment ?? 0), 0)
    const unitAmount = Math.round((basePrice + modifierTotal) * 100)
    if (unitAmount < 50) {
      // Stripe Checkout minimum is ~$0.50 USD.
      return Response.json(
        { error: `"${menuItem.name}" is below the minimum charge amount for payments.` },
        { status: 400 }
      )
    }

    const modifierLabel = (entry.selected_modifiers ?? [])
      .map((m) => (m.modifier_type === 'remove' ? `no ${m.option_name}` : m.option_name))
      .join(', ')

    lineItems.push({
      quantity: entry.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: {
          name: menuItem.name,
          ...(modifierLabel ? { description: modifierLabel } : {}),
        },
      },
    })
  }

  const stripe = new Stripe(venue.stripe_secret_key)
  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  // Cart is stashed in session metadata so the success page can recreate the
  // order row + fire Slack. Stripe limits metadata values to 500 chars; orders
  // typically fit easily but guard against an unreasonably large cart.
  const cartMetadata = JSON.stringify(body.cart)
  if (cartMetadata.length > 450) {
    return Response.json(
      { error: 'Cart is too large for payment. Please split into smaller orders.' },
      { status: 400 }
    )
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/order/${venue.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/order/${venue.slug}`,
      metadata: {
        venue_id: venue.id,
        location_id: body.locationId,
        fulfillment: body.fulfillment,
        delivery_location: body.deliveryLocation ?? '',
        customer_id_value: body.customerIdValue ?? '',
        notes: body.notes ?? '',
        cart: cartMetadata,
      },
    })

    if (!session.url) {
      return Response.json({ error: 'Failed to start checkout' }, { status: 500 })
    }

    console.log('[Checkout] created session', session.id, 'for venue', venue.id)
    return Response.json({ url: session.url })
  } catch (err) {
    // Intentionally opaque: never echo Stripe error details that might
    // include the secret key or account context to the client.
    console.error('[Checkout] stripe session create failed for venue', venue.id, err instanceof Error ? err.message : 'unknown')
    return Response.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
