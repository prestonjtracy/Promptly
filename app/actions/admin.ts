'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { encryptStripeKey } from '@/lib/crypto/stripe-key'

const COOKIE_NAME = 'promptly_admin_venue'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

// ── Auth ─────────────────────────────────────────────────────

export async function loginWithPasscode(slug: string, passcode: string) {
  // Service-role client: passcode_hash is REVOKEd from anon/authenticated
  // at the DB level (migration 00012) so a browser-visible key can never
  // read it. This is the only path that should read the column.
  const service = createServiceClient()

  const { data: venue } = await service
    .from('venues')
    .select('id, passcode_hash')
    .eq('slug', slug)
    .maybeSingle()

  const venueRow = venue as { id: string; passcode_hash: string } | null

  // Run bcrypt.compare even when the venue is missing, against a throwaway
  // hash, so the response time doesn't distinguish "no such slug" from
  // "wrong passcode". Small but free hardening.
  const hashToCompare =
    venueRow?.passcode_hash ??
    '$2a$10$CwTycUXWue0Thq9StjUM0uJ8qfXaobd9xVoSt8CgE2wbqg.PkbK6e'
  const ok = await bcrypt.compare(passcode, hashToCompare)

  if (!venueRow || !ok) {
    return { error: 'Incorrect slug or passcode.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, venueRow.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return { success: true, venueId: venueRow.id }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getAdminVenueId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

// ── Requests ─────────────────────────────────────────────────

export async function createRequest(data: {
  venue_id: string
  name: string
  description: string | null
  price: number | null
  category_id: string | null
  icon_url: string | null
  internal_notes: string | null
  internal_only: boolean
  internal_category: string | null
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
    icon_url: data.icon_url,
    internal_notes: data.internal_notes,
    internal_only: data.internal_only,
    internal_category: data.internal_category,
    sort_order: data.sort_order,
  })

  if (error) return { error: 'Failed to create request.' }
  return { success: true }
}

export async function updateRequest(
  itemId: string,
  venueId: string,
  data: {
    name: string
    description: string | null
    price: number | null
    category_id: string | null
    icon_url: string | null
    internal_notes: string | null
    internal_only: boolean
    internal_category: string | null
    slack_channel: string | null
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
      icon_url: data.icon_url,
      internal_notes: data.internal_notes,
      internal_only: data.internal_only,
      internal_category: data.internal_category,
      slack_channel: data.slack_channel,
    })
    .eq('id', itemId)
    .eq('venue_id', venueId)

  if (error) return { error: 'Failed to update request.' }
  return { success: true }
}

export async function deleteRequest(itemId: string, venueId: string) {
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

  if (error) return { error: 'Failed to delete request.' }
  return { success: true }
}

export async function reorderRequests(
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

    if (error) return { error: 'Failed to reorder requests.' }
  }

  return { success: true }
}

// ── Workspace Settings ───────────────────────────────────────

export async function updateWorkspaceSettings(
  venueId: string,
  settings: {
    allow_pickup: boolean
    allow_delivery: boolean
    customer_id_label: string | null
    customer_id_required: boolean
    allow_notes: boolean
    delivery_location_placeholder: string | null
    default_slack_channel: string | null
    primary_color: string
    accent_color: string
    logo_url: string | null
    payments_enabled?: boolean
    stripe_secret_key?: string
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

  const paymentsTouched =
    typeof settings.payments_enabled === 'boolean' ||
    (typeof settings.stripe_secret_key === 'string' && settings.stripe_secret_key.length > 0)

  // Plan-gate payment fields: pos_only venues must never be able to set them.
  if (paymentsTouched) {
    const supabase = await createClient()
    const { data: planRow } = await supabase
      .from('venues')
      .select('plan_type')
      .eq('id', venueId)
      .single()
    if ((planRow as { plan_type: string } | null)?.plan_type !== 'full_commerce') {
      return { error: 'Payments not available on current plan.' }
    }
  }

  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {
    allow_pickup: settings.allow_pickup,
    allow_delivery: settings.allow_delivery,
    customer_id_label: settings.customer_id_label || null,
    customer_id_required: settings.customer_id_label ? settings.customer_id_required : false,
    allow_notes: settings.allow_notes,
    delivery_location_placeholder: settings.delivery_location_placeholder || null,
    default_slack_channel: settings.default_slack_channel || null,
    primary_color: settings.primary_color,
    accent_color: settings.accent_color,
    logo_url: settings.logo_url,
  }

  if (typeof settings.payments_enabled === 'boolean') {
    updatePayload.payments_enabled = settings.payments_enabled
  }
  if (typeof settings.stripe_secret_key === 'string' && settings.stripe_secret_key.length > 0) {
    // Encrypt before storing so a service-role leak or DB dump can't reveal
    // sk_live_* keys. encryptStripeKey is idempotent on already-encrypted
    // input, so accidental double-encryption is impossible here.
    try {
      updatePayload.stripe_secret_key = encryptStripeKey(settings.stripe_secret_key.trim())
    } catch (err) {
      console.error('[updateWorkspaceSettings] encrypt failed', err instanceof Error ? err.message : err)
      return { error: 'Encryption is not configured. Contact platform admin.' }
    }
  }

  const { error } = await supabase
    .from('venues')
    .update(updatePayload)
    .eq('id', venueId)

  if (error) return { error: 'Failed to save workspace settings.' }
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

  if (error || !data) return { error: 'Failed to add option group.' }
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

// ── Custom Tabs (feature: custom_tabs) ───────────────────────

/**
 * Idempotent seed for a venue that just had custom_tabs enabled. Creates a
 * default "Menu" Requests tab and reparents existing menu_items to it so the
 * customer page doesn't go blank the moment the flag flips. Safe to call on
 * every admin load — the tab-count check is the guard.
 */
export async function ensureDefaultTab(venueId: string) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) return

  const supabase = await createClient()

  const { count } = await supabase
    .from('venue_tabs')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)

  if ((count ?? 0) > 0) return

  const { data: created } = await supabase
    .from('venue_tabs')
    .insert({ venue_id: venueId, name: 'Menu', type: 'requests', sort_order: 0 })
    .select('id')
    .single()

  const tabId = (created as { id: string } | null)?.id
  if (!tabId) return

  await supabase
    .from('menu_items')
    .update({ tab_id: tabId })
    .eq('venue_id', venueId)
    .is('tab_id', null)
}

export async function createTab(
  venueId: string,
  data: { name: string; type: 'requests' | 'info' }
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }
  const name = data.name.trim()
  if (!name) return { error: 'Tab name is required.' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('venue_tabs')
    .select('sort_order')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder =
    existing && existing.length > 0
      ? (existing[0] as { sort_order: number }).sort_order + 1
      : 0

  const { data: row, error } = await supabase
    .from('venue_tabs')
    .insert({
      venue_id: venueId,
      name,
      type: data.type,
      config: {},
      sort_order: nextOrder,
    })
    .select('id')
    .single()

  if (error || !row) return { error: 'Failed to create tab.' }
  return { success: true, tabId: (row as { id: string }).id }
}

export async function updateTab(
  tabId: string,
  venueId: string,
  data: { name: string; config?: Record<string, unknown> }
) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }
  const name = data.name.trim()
  if (!name) return { error: 'Tab name is required.' }

  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = { name }
  if (data.config !== undefined) updatePayload.config = data.config

  const { error } = await supabase
    .from('venue_tabs')
    .update(updatePayload)
    .eq('id', tabId)
    .eq('venue_id', venueId)

  if (error) return { error: 'Failed to update tab.' }
  return { success: true }
}

export async function deleteTab(tabId: string, venueId: string) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  // ON DELETE SET NULL on menu_items.tab_id means items attached to this tab
  // are not deleted — they fall back to the customer-page default bucket.
  const { error } = await supabase
    .from('venue_tabs')
    .delete()
    .eq('id', tabId)
    .eq('venue_id', venueId)

  if (error) return { error: 'Failed to delete tab.' }
  return { success: true }
}

export async function reorderTabs(venueId: string, tabIds: string[]) {
  const adminVenueId = await getAdminVenueId()
  if (!adminVenueId || adminVenueId !== venueId) {
    return { error: 'Unauthorized.' }
  }

  const supabase = await createClient()

  for (let i = 0; i < tabIds.length; i++) {
    const { error } = await supabase
      .from('venue_tabs')
      .update({ sort_order: i })
      .eq('id', tabIds[i])
      .eq('venue_id', venueId)
    if (error) return { error: 'Failed to reorder tabs.' }
  }

  return { success: true }
}
