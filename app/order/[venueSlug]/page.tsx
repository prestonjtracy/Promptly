import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasFeature } from '@/lib/features'
import { VENUE_PUBLIC_COLUMNS, type Venue, type Location, type RequestWithModifiers, type VenueTab } from '@/lib/supabase/types'
import { OrderForm } from './_components/order-form'

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

  // Explicit column list — stripe_secret_key is REVOKEd from anon and must
  // not cross into client components anyway.
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select(VENUE_PUBLIC_COLUMNS)
    .eq('slug', venueSlug)
    .single()

  if (venueError || !venue) {
    console.error('[OrderPage] Venue not found:', venueSlug, venueError?.message)
    notFound()
  }

  // Customer page doesn't need to know whether a key is saved — it only
  // branches on payments_enabled + plan_type. The route handler validates
  // key presence at checkout time.
  const typedVenue: Venue = {
    ...(venue as unknown as Omit<Venue, 'hasStripeKey'>),
    hasStripeKey: false,
  }

  let location: Location | null = null
  if (cartParam) {
    const { data: locByCode } = await supabase
      .from('locations')
      .select('*')
      .eq('venue_id', typedVenue.id)
      .eq('code', cartParam)
      .single()

    if (locByCode) {
      location = locByCode as unknown as Location
    } else {
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

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*), modifier_groups(*, options:modifier_options(*))')
    .eq('venue_id', typedVenue.id)
    .eq('is_active', true)
    .eq('internal_only', false)
    .order('sort_order')

  const typedMenuItems = ((menuItems ?? []) as unknown as RequestWithModifiers[]).map(
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

  // Load configured tabs only when the feature is on. 'internal' tabs are
  // hidden from the customer page — those exist for staff workflows.
  let customerTabs: VenueTab[] = []
  if (hasFeature(typedVenue, 'custom_tabs')) {
    const { data: tabRows } = await supabase
      .from('venue_tabs')
      .select('*')
      .eq('venue_id', typedVenue.id)
      .neq('type', 'internal')
      .order('sort_order')
    customerTabs = (tabRows ?? []) as unknown as VenueTab[]
  }

  return (
    <OrderForm
      venue={typedVenue}
      location={location}
      menuItems={typedMenuItems}
      tabs={customerTabs}
    />
  )
}
