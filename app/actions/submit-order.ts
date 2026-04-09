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
}

type SubmitOrderResult =
  | { success: true; orderId: string; error?: undefined }
  | { success?: undefined; error: string }

async function sendSlackNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: SubmitOrderInput
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_DEFAULT
  console.log('[Slack] SLACK_WEBHOOK_DEFAULT:', webhookUrl ? `set (${webhookUrl.substring(0, 40)}...)` : 'NOT SET')
  if (!webhookUrl) {
    console.log('[Slack] Skipping — no webhook URL configured')
    return
  }

  try {
    // Fetch venue, location, and menu item names
    const [venueRes, locationRes, menuItemsRes] = await Promise.all([
      supabase.from('venues').select('name, customer_id_label, location_type_label').eq('id', data.venue_id).single(),
      supabase.from('locations').select('name').eq('id', data.location_id).single(),
      supabase
        .from('menu_items')
        .select('id, name')
        .in('id', data.items.map((i) => i.menu_item_id)),
    ])

    const venueName = venueRes.data?.name ?? 'Unknown venue'
    const customerIdLabel = venueRes.data?.customer_id_label ?? 'Customer ID'
    const locationTypeLabel = venueRes.data?.location_type_label ?? 'Location'
    const locationName = locationRes.data?.name ?? 'Unknown'
    const menuItemMap = new Map(
      (menuItemsRes.data ?? []).map((mi: { id: string; name: string }) => [mi.id, mi.name])
    )

    // Build item lines
    const itemLines = data.items.map((item) => {
      const name = menuItemMap.get(item.menu_item_id) ?? 'Unknown item'
      let line = `• ${name} x${item.quantity}`
      const mods = (item.selected_modifiers ?? [])
      if (mods.length > 0) {
        const modStrings = mods.map((m) => {
          const prefix = m.modifier_type === 'remove' ? '−' : '+'
          const price = m.modifier_type !== 'remove' && m.price_adjustment > 0
            ? ` ($${m.price_adjustment.toFixed(2)})`
            : ''
          return `  ${prefix} ${m.option_name}${price}`
        })
        line += '\n' + modStrings.join('\n')
      }
      return line
    })

    // Build detail lines
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

    const message = {
      text: `New order at ${venueName} — ${locationTypeLabel}: ${locationName}\n\n${itemLines.join('\n')}\n\n${details.join('\n')}`,
    }

    console.log('[Slack] Sending notification...')
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    console.log('[Slack] Response:', res.status, await res.text())
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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        venue_id: data.venue_id,
        location_id: data.location_id,
        fulfillment: data.fulfillment,
        delivery_location: data.delivery_location,
        customer_id_value: data.customer_id_value,
        notes: data.notes,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Order insert error:', orderError)
      return { error: `Failed to submit order: ${orderError?.message ?? 'Unknown error'}` }
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
      console.error('Order items insert error:', itemsError)
      return { error: `Failed to submit items: ${itemsError.message}` }
    }

    // Send Slack notification
    await sendSlackNotification(supabase, data)

    return { success: true, orderId: order.id }
  } catch (err) {
    console.error('Unexpected submit error:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}
