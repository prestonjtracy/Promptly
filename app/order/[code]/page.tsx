import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { LocationWithVenue, MenuItemWithModifiers } from '@/lib/supabase/types'
import { OrderForm } from './_components/order-form'

export async function generateMetadata(props: PageProps<'/order/[code]'>) {
  const { code } = await props.params
  const supabase = await createClient()

  const { data: location } = await supabase
    .from('locations')
    .select('name, venue:venues(name)')
    .eq('code', code)
    .single()

  if (!location?.venue) {
    return { title: 'Order — Promptly' }
  }

  const venue = location.venue as unknown as { name: string }
  return {
    title: `${venue.name} — Promptly`,
    description: `Place a request at ${venue.name}`,
  }
}

export default async function OrderPage(props: PageProps<'/order/[code]'>) {
  const { code } = await props.params
  const supabase = await createClient()

  const { data: location, error: locationError } = await supabase
    .from('locations')
    .select('*, venue:venues(*)')
    .eq('code', code)
    .single()

  if (locationError) {
    console.error('[OrderPage] Location lookup failed:', { code, error: locationError.message, details: locationError })
  }

  if (!location?.venue) {
    console.error('[OrderPage] No location/venue found for code:', code, '| location:', location)
    notFound()
  }

  const typedLocation = location as unknown as LocationWithVenue

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*), modifier_groups(*, options:modifier_options(*))')
    .eq('venue_id', typedLocation.venue_id)
    .eq('is_active', true)
    .order('sort_order')

  // Sort nested modifier_groups and options by sort_order
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

  return (
    <OrderForm
      venue={typedLocation.venue}
      location={typedLocation}
      menuItems={typedMenuItems}
    />
  )
}
