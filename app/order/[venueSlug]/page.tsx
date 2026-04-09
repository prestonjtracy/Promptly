import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Venue, Location, MenuItemWithModifiers } from '@/lib/supabase/types'
import { OrderPageClient } from './_components/order-page-client'

export async function generateMetadata(props: {
  params: Promise<{ venueSlug: string }>
}) {
  const { venueSlug } = await props.params
  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('name')
    .eq('slug', venueSlug)
    .single()

  if (!venue) return { title: 'Order — Promptly' }
  return {
    title: `${venue.name} — Promptly`,
    description: `Place a request at ${venue.name}`,
  }
}

export default async function OrderPage(props: {
  params: Promise<{ venueSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { venueSlug } = await props.params
  const searchParams = await props.searchParams
  const cartParam = typeof searchParams.cart === 'string' ? searchParams.cart : null

  const supabase = await createClient()

  // Look up venue by slug
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', venueSlug)
    .single()

  if (venueError || !venue) {
    console.error('[OrderPage] Venue not found:', venueSlug, venueError?.message)
    notFound()
  }

  const typedVenue = venue as unknown as Venue

  // Try to find a matching location for the cart param
  let location: Location | null = null
  if (cartParam) {
    // Try exact code match first
    const { data: locByCode } = await supabase
      .from('locations')
      .select('*')
      .eq('venue_id', typedVenue.id)
      .eq('code', cartParam)
      .single()

    if (locByCode) {
      location = locByCode as unknown as Location
    } else {
      // Try matching name like "Cart 4" where cartParam = "4"
      const { data: locByName } = await supabase
        .from('locations')
        .select('*')
        .eq('venue_id', typedVenue.id)
        .ilike('name', `%${cartParam}%`)
        .limit(1)
        .single()

      if (locByName) {
        location = locByName as unknown as Location
      }
    }
  }

  // If no location found, grab the first active one for the venue
  if (!location) {
    const { data: firstLoc } = await supabase
      .from('locations')
      .select('*')
      .eq('venue_id', typedVenue.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (firstLoc) {
      location = firstLoc as unknown as Location
    }
  }

  if (!location) {
    console.error('[OrderPage] No locations found for venue:', venueSlug)
    notFound()
  }

  // Fetch menu items with categories and modifiers
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*), modifier_groups(*, options:modifier_options(*))')
    .eq('venue_id', typedVenue.id)
    .eq('is_active', true)
    .order('sort_order')

  const typedMenuItems = ((menuItems ?? []) as unknown as MenuItemWithModifiers[]).map(
    (item) => ({
      ...item,
      modifier_groups: (item.modifier_groups ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => ({
          ...g,
          options: (g.options ?? []).sort((a, b) => a.sort_order - b.sort_order),
        })),
    })
  )

  // Fetch all categories for tabs
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('venue_id', typedVenue.id)
    .order('sort_order')

  return (
    <OrderPageClient
      venue={typedVenue}
      location={location}
      menuItems={typedMenuItems}
      categories={(categories ?? []) as unknown as import('@/lib/supabase/types').MenuCategory[]}
      cartDisplay={cartParam ?? location.name}
    />
  )
}
