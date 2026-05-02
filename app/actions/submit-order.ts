'use server'

import { createClient } from '@/lib/supabase/server'
import type { FulfillmentType, SelectedModifier } from '@/lib/supabase/types'

type SubmitOrderInput = {
  venue_id: string
  location_id: string
  fulfillment: FulfillmentType
  delivery_location: string | null
  customer_id_value: string | null
  notes: string | null
  items: {
    menu_item_id: string
    quantity: number
    selected_modifiers: SelectedModifier[]
  }[]
  // When present, the order row is keyed to a paid Stripe Checkout session.
  // Re-submitting with the same id returns the existing order_number instead
  // of creating duplicates (refresh-safe).
  stripe_session_id?: string
}

type SubmitOrderResult =
  | { success: true; orderId: string; orderNumber: number; error?: undefined }
  | { success?: undefined; orderId?: undefined; orderNumber?: undefined; error: string }

async function sendSlackNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: SubmitOrderInput,
  orderNumber: number
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_DEFAULT
  const botToken = process.env.SLACK_BOT_TOKEN

  if (!webhookUrl && !botToken) {
    console.log('[Slack] No webhook or bot token configured — skipping')
    return
  }

  try {
    // Fetch venue (with default channel), location, and items (with per-item channel)
    const [venueRes, locationRes, menuItemsRes] = await Promise.all([
      supabase
        .from('venues')
        .select('name, customer_id_label, location_type_label, default_slack_channel')
        .eq('id', data.venue_id)
        .single(),
      supabase.from('locations').select('name').eq('id', data.location_id).single(),
      supabase
        .from('menu_items')
        .select('id, name, price, slack_channel')
        .in('id', data.items.map((i) => i.menu_item_id)),
    ])

    const venueName = venueRes.data?.name ?? 'Unknown venue'
    const customerIdLabel = venueRes.data?.customer_id_label ?? 'Customer ID'
    const locationTypeLabel = venueRes.data?.location_type_label ?? 'Location'
    const defaultChannel = venueRes.data?.default_slack_channel ?? null
    const locationName = locationRes.data?.name ?? 'Unknown'

    const menuItemMap = new Map(
      (menuItemsRes.data ?? []).map((mi: {
        id: string
        name: string
        price: number | null
        slack_channel: string | null
      }) => [
        mi.id,
        { name: mi.name, price: mi.price, slack_channel: mi.slack_channel },
      ])
    )

    // Build shared detail lines
    const details: string[] = []
    details.push(`*Fulfillment:* ${data.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}`)
    if (data.fulfillment === 'delivery' && data.delivery_location) {
      details.push(`*Deliver to:* ${data.delivery_location}`)
    }
    if (data.customer_id_value) {
      details.push(`*${customerIdLabel}:* ${data.customer_id_value}`)
    }
    if (data.notes) {
      details.push(`*Notes:* ${data.notes}`)
    }

    // Group items by their resolved Slack channel
    // channel = item.slack_channel || venue.default_slack_channel || null
    const channelGroups = new Map<string | null, typeof data.items>()

    for (const item of data.items) {
      const meta = menuItemMap.get(item.menu_item_id)
      const channel = meta?.slack_channel || defaultChannel || null
      const group = channelGroups.get(channel) ?? []
      group.push(item)
      channelGroups.set(channel, group)
    }

    // Build and send one message per channel
    for (const [channel, items] of channelGroups) {
      const itemLines = items.map((item) => {
        const meta = menuItemMap.get(item.menu_item_id)
        const name = meta?.name ?? 'Unknown item'
        const mods = item.selected_modifiers ?? []
        const modifierTotal = mods
          .filter((m) => m.modifier_type !== 'remove')
          .reduce((sum, m) => sum + m.price_adjustment, 0)
        const unitTotal =
          meta?.price == null ? null : meta.price + modifierTotal
        const lineTotal =
          unitTotal == null ? null : unitTotal * item.quantity
        const priceSuffix = lineTotal == null ? '' : ` — $${lineTotal.toFixed(2)}`
        let line = `• ${name} x${item.quantity}${priceSuffix}`
        if (mods.length > 0) {
          const modStrings = mods.map((m) => {
            const prefix = m.modifier_type === 'remove' ? '−' : '+'
            const price =
              m.modifier_type !== 'remove' && m.price_adjustment > 0
                ? ` ($${m.price_adjustment.toFixed(2)})`
                : ''
            return `  ${prefix} ${m.option_name}${price}`
          })
          line += '\n' + modStrings.join('\n')
        }
        return line
      })

      const text = `*Order #${orderNumber}*\nNew request at ${venueName} — ${locationTypeLabel}: ${locationName}\n\n${itemLines.join('\n')}\n\n${details.join('\n')}`

      // Route: if we have a specific channel + bot token, use chat.postMessage
      // Otherwise fall back to the default webhook
      if (channel && botToken) {
        // Strip leading # if present
        const channelName = channel.replace(/^#/, '')
        console.log(`[Slack] Routing to #${channelName} via Bot Token`)
        const res = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${botToken}`,
          },
          body: JSON.stringify({ channel: channelName, text }),
        })
        const body = await res.json()
        console.log(`[Slack] #${channelName} response:`, body.ok ? 'ok' : body.error)
      } else if (webhookUrl) {
        console.log('[Slack] Sending via default webhook')
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        console.log('[Slack] Webhook response:', res.status, await res.text())
      }
    }
  } catch (err) {
    console.error('[Slack] Notification error:', err)
  }
}

export async function submitOrder(
  data: SubmitOrderInput
): Promise<SubmitOrderResult> {
  try {
    if (!data.items.length) {
      return { error: 'Please select at least one item.' }
    }

    const supabase = await createClient()

    // Tenancy check: the client supplies venue_id and location_id, so we must
    // verify the location actually belongs to the claimed venue before writing.
    // Without this, a customer on venue A could submit orders against venue B.
    const { data: locationRow } = await supabase
      .from('locations')
      .select('venue_id')
      .eq('id', data.location_id)
      .maybeSingle()

    if (!locationRow || (locationRow as { venue_id: string }).venue_id !== data.venue_id) {
      return { error: 'Invalid location for this venue.' }
    }

    const itemIds = data.items.map((i) => i.menu_item_id)
    const { data: menuRows } = await supabase
      .from('menu_items')
      .select('id, venue_id')
      .in('id', itemIds)

    const venueItems = (menuRows ?? []) as { id: string; venue_id: string }[]
    // Compare against the DEDUPED count of requested ids. Postgres-side
    // `id in (...)` returns one row per distinct id regardless of how many
    // times it appeared in the input, so a cart with two line items pointing
    // to the same menu_item_id (same item with two different modifier sets,
    // for instance) used to fall out of `length === length` and be rejected.
    const uniqueItemIds = new Set(itemIds)
    const allBelong =
      uniqueItemIds.size === venueItems.length &&
      venueItems.every((m) => m.venue_id === data.venue_id)

    if (!allBelong) {
      return { error: 'One or more items are not available at this venue.' }
    }

    // Idempotency: if this Stripe session already produced an order, return it
    // without re-inserting or re-notifying Slack. Guards against success-page
    // refreshes and concurrent tabs.
    if (data.stripe_session_id) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('stripe_session_id', data.stripe_session_id)
        .maybeSingle()
      if (existing) {
        return {
          success: true,
          orderId: existing.id,
          orderNumber: existing.order_number,
        }
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        venue_id: data.venue_id,
        location_id: data.location_id,
        fulfillment: data.fulfillment,
        delivery_location: data.delivery_location,
        customer_id_value: data.customer_id_value,
        notes: data.notes,
        stripe_session_id: data.stripe_session_id ?? null,
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      // Underlying Postgres errors can echo column values in their messages
      // (e.g. constraint-violation text including customer_id_value or notes).
      // Log the raw error server-side; return a generic string so it can't
      // be forwarded into Stripe metadata or Slack alerts as PII.
      console.error('[submitOrder] order insert error', orderError?.message ?? 'unknown')
      return { error: 'Could not save the order. Please contact support.' }
    }

    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      selected_modifiers: item.selected_modifiers ?? [],
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      // Same redaction policy as the order-insert error above.
      console.error('[submitOrder] order_items insert error', itemsError.message)
      return { error: 'Could not save the order items. Please contact support.' }
    }

    // Send Slack notification(s)
    await sendSlackNotification(supabase, data, order.order_number)

    return { success: true, orderId: order.id, orderNumber: order.order_number }
  } catch (err) {
    console.error('Unexpected submit error:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}
