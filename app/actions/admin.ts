'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const COOKIE_NAME = 'promptly_admin_venue'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

// ── Auth ─────────────────────────────────────────────────────

export async function loginWithPasscode(slug: string, passcode: string) {
  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('id, passcode')
    .eq('slug', slug)
    .single()

  if (!venue) {
    return { error: 'Venue not found.' }
  }

  if (venue.passcode !== passcode) {
    return { error: 'Incorrect passcode.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, venue.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true, venueId: venue.id }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAdminVenueId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

// ── Menu Items ───────────────────────────────────────────────

export async function addMenuItem(data: {
  venue_id: string
  name: string
  description: string | null
  price: number | null
  category_id: string | null
  sort_order: number
}) {
  const venueId = await getAdminVenueId()
  if (!venueId || venueId !== data.venue_id) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('menu_items').insert({
    venue_id: data.venue_id,
    name: data.name,
    description: data.description,
    price: data.price,
    category_id: data.category_id,
    sort_order: data.sort_order,
  })

  if (error) return { error: 'Failed to add menu item.' }
  return { success: true }
}

export async function updateMenuItem(
  itemId: string,
  venueId: string,
  data: {
    name: string
    description: string | null
    price: number | null
    category_id: string | null
  }
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('menu_items')
    .update({
      name: data.name,
      description: data.description,
      price: data.price,
      category_id: data.category_id,
    })
    .eq('id', itemId)
    .eq('venue_id', venueId)

  if (error) return { error: 'Failed to update menu item.' }
  return { success: true }
}

export async function deleteMenuItem(itemId: string, venueId: string) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId)
    .eq('venue_id', venueId)

  if (error) return { error: 'Failed to delete menu item.' }
  return { success: true }
}

export async function reorderMenuItems(
  venueId: string,
  items: { id: string; sort_order: number }[]
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  for (const item of items) {
    const { error } = await supabase
      .from('menu_items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('venue_id', venueId)

    if (error) return { error: 'Failed to reorder items.' }
  }

  return { success: true }
}

// ── Venue Settings ───────────────────────────────────────────

export async function updateVenueSettings(
  venueId: string,
  settings: {
    allow_pickup: boolean
    allow_delivery: boolean
    customer_id_label: string | null
    customer_id_required: boolean
    allow_notes: boolean
    delivery_location_placeholder: string | null
  }
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  // At least one fulfillment method must be enabled
  if (!settings.allow_pickup && !settings.allow_delivery) {
    return { error: 'At least one fulfillment option (pickup or delivery) must be enabled.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('venues')
    .update({
      allow_pickup: settings.allow_pickup,
      allow_delivery: settings.allow_delivery,
      customer_id_label: settings.customer_id_label || null,
      customer_id_required: settings.customer_id_label ? settings.customer_id_required : false,
      allow_notes: settings.allow_notes,
      delivery_location_placeholder: settings.delivery_location_placeholder || null,
    })
    .eq('id', venueId)

  if (error) return { error: 'Failed to update settings.' }
  return { success: true }
}

// ── Categories ───────────────────────────────────────────────

export async function addCategory(venueId: string, name: string) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Get max sort_order
  const { data: existing } = await supabase
    .from('menu_categories')
    .select('sort_order')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({ venue_id: venueId, name, sort_order: nextOrder })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to add category.' }
  return { success: true, categoryId: data.id }
}

// ── Modifier Groups ──────────────────────────────────────────

export async function addModifierGroup(
  menuItemId: string,
  venueId: string,
  name: string
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Verify item belongs to venue
  const { data: item } = await supabase
    .from('menu_items')
    .select('id')
    .eq('id', menuItemId)
    .eq('venue_id', venueId)
    .single()

  if (!item) return { error: 'Menu item not found.' }

  const { data: existing } = await supabase
    .from('modifier_groups')
    .select('sort_order')
    .eq('menu_item_id', menuItemId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('modifier_groups')
    .insert({ menu_item_id: menuItemId, name, sort_order: nextOrder })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to add modifier group.' }
  return { success: true, groupId: data.id }
}

export async function deleteModifierGroup(groupId: string, venueId: string) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Verify ownership: group → menu_item → venue
  const { data: group } = await supabase
    .from('modifier_groups')
    .select('id, menu_item:menu_items(venue_id)')
    .eq('id', groupId)
    .single()

  const menuItem = group?.menu_item as unknown as { venue_id: string } | null
  if (!group || menuItem?.venue_id !== venueId) {
    return { error: 'Not found.' }
  }

  const { error } = await supabase
    .from('modifier_groups')
    .delete()
    .eq('id', groupId)

  if (error) return { error: 'Failed to delete modifier group.' }
  return { success: true }
}

export async function addModifierOption(
  groupId: string,
  venueId: string,
  data: { name: string; modifier_type: 'add' | 'remove'; price_adjustment: number }
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Verify ownership
  const { data: group } = await supabase
    .from('modifier_groups')
    .select('id, menu_item:menu_items(venue_id)')
    .eq('id', groupId)
    .single()

  const menuItem = group?.menu_item as unknown as { venue_id: string } | null
  if (!group || menuItem?.venue_id !== venueId) {
    return { error: 'Not found.' }
  }

  const { data: existing } = await supabase
    .from('modifier_options')
    .select('sort_order')
    .eq('modifier_group_id', groupId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error } = await supabase.from('modifier_options').insert({
    modifier_group_id: groupId,
    name: data.name,
    modifier_type: data.modifier_type,
    price_adjustment: data.modifier_type === 'remove' ? 0 : data.price_adjustment,
    sort_order: nextOrder,
  })

  if (error) return { error: 'Failed to add option.' }
  return { success: true }
}

export async function updateModifierOption(
  optionId: string,
  venueId: string,
  data: { name: string; modifier_type: 'add' | 'remove'; price_adjustment: number }
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Verify ownership: option → group → menu_item → venue
  const { data: option } = await supabase
    .from('modifier_options')
    .select('id, modifier_group:modifier_groups(menu_item:menu_items(venue_id))')
    .eq('id', optionId)
    .single()

  const modGroup = option?.modifier_group as unknown as {
    menu_item: { venue_id: string } | null
  } | null
  if (!option || modGroup?.menu_item?.venue_id !== venueId) {
    return { error: 'Not found.' }
  }

  const { error } = await supabase
    .from('modifier_options')
    .update({
      name: data.name,
      modifier_type: data.modifier_type,
      price_adjustment: data.modifier_type === 'remove' ? 0 : data.price_adjustment,
    })
    .eq('id', optionId)

  if (error) return { error: 'Failed to update option.' }
  return { success: true }
}

export async function deleteModifierOption(
  optionId: string,
  venueId: string
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // Verify ownership: option → group → menu_item → venue
  const { data: option } = await supabase
    .from('modifier_options')
    .select('id, modifier_group:modifier_groups(menu_item:menu_items(venue_id))')
    .eq('id', optionId)
    .single()

  const modGroup = option?.modifier_group as unknown as {
    menu_item: { venue_id: string } | null
  } | null
  if (!option || modGroup?.menu_item?.venue_id !== venueId) {
    return { error: 'Not found.' }
  }

  const { error } = await supabase
    .from('modifier_options')
    .delete()
    .eq('id', optionId)

  if (error) return { error: 'Failed to delete option.' }
  return { success: true }
}
