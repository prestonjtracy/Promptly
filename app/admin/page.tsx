import { redirect } from 'next/navigation'
import { getAdminVenueId } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from './_components/admin-dashboard'
import type { RequestWithModifiers, Category, Venue } from '@/lib/supabase/types'

export const metadata = {
  title: 'Admin — Promptly',
}

export default async function AdminPage(props: PageProps<'/admin'>) {
  const searchParams = await props.searchParams

  const venueId = await getAdminVenueId()

  if (!venueId) {
    redirect('/admin/login')
  }

  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .single()

  if (!venue) {
    redirect('/admin/login')
  }

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*), modifier_groups(*, options:modifier_options(*))')
    .eq('venue_id', venueId)
    .order('sort_order')

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('venue_id', venueId)
    .order('sort_order')

  const tab = (searchParams?.tab as string) ?? 'requests'

  return (
    <AdminDashboard
      venue={venue as unknown as Venue}
      requests={(menuItems ?? []) as unknown as RequestWithModifiers[]}
      categories={(categories ?? []) as unknown as Category[]}
      activeTab={tab}
    />
  )
}
