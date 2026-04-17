import { redirect } from 'next/navigation'
import { getAdminVenueId } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasFeature } from '@/lib/features'
import { AdminDashboard } from './_components/admin-dashboard'
import { VENUE_PUBLIC_COLUMNS, type RequestWithModifiers, type Category, type Venue } from '@/lib/supabase/types'
import type { AnalyticsData } from './_components/analytics'

export const metadata = {
  title: 'Admin — Promptly',
}

type DateRange = '7d' | '30d' | 'all'

function computeAnalytics(
  orders: { created_at: string; fulfillment: string }[],
  orderItems: { menu_item_id: string; quantity: number; created_at: string }[],
  itemNames: Map<string, string>,
  daysBack: number | null
): AnalyticsData {
  const now = new Date()
  const cutoff = daysBack
    ? new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    : null

  const filteredOrders = cutoff
    ? orders.filter((o) => new Date(o.created_at) >= cutoff)
    : orders

  const filteredItems = cutoff
    ? orderItems.filter((oi) => new Date(oi.created_at) >= cutoff)
    : orderItems

  // Total
  const totalRequests = filteredOrders.length

  // By type (item name → total quantity)
  const typeMap = new Map<string, number>()
  for (const oi of filteredItems) {
    const name = itemNames.get(oi.menu_item_id) ?? 'Unknown'
    typeMap.set(name, (typeMap.get(name) ?? 0) + oi.quantity)
  }
  const requestsByType = Array.from(typeMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // By day
  const dayMap = new Map<string, number>()
  for (const o of filteredOrders) {
    const day = new Date(o.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  const requestsByDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))

  // By hour
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
  for (const o of filteredOrders) {
    const h = new Date(o.created_at).getHours()
    hourCounts[h].count++
  }

  // Fulfillment
  const fulfillMap = new Map<string, number>()
  for (const o of filteredOrders) {
    fulfillMap.set(o.fulfillment, (fulfillMap.get(o.fulfillment) ?? 0) + 1)
  }
  const fulfillmentBreakdown = Array.from(fulfillMap.entries())
    .map(([type, count]) => ({ type, count }))

  return {
    totalRequests,
    requestsByType,
    requestsByDay,
    requestsByHour: hourCounts,
    fulfillmentBreakdown,
  }
}

export default async function AdminPage(props: PageProps<'/admin'>) {
  const searchParams = await props.searchParams

  const venueId = await getAdminVenueId()

  if (!venueId) {
    redirect('/admin/login')
  }

  const supabase = await createClient()

  // Column list explicitly excludes stripe_secret_key (REVOKEd from anon/
  // authenticated at the DB level). We derive hasStripeKey via a separate
  // existence check so the client never receives the key itself.
  const { data: venue } = await supabase
    .from('venues')
    .select(VENUE_PUBLIC_COLUMNS)
    .eq('id', venueId)
    .single()

  if (!venue) {
    redirect('/admin/login')
  }

  // Key presence check uses the service-role client since the column is
  // REVOKEd from anon/authenticated. Only the boolean crosses the server
  // boundary — the key itself never leaves this scope.
  let hasStripeKey = false
  try {
    const service = createServiceClient()
    const { data: keyRow } = await service
      .from('venues')
      .select('stripe_secret_key')
      .eq('id', venueId)
      .single()
    hasStripeKey = !!(keyRow as { stripe_secret_key: string | null } | null)?.stripe_secret_key
  } catch {
    // Service role not configured — payments features unavailable, UI falls back gracefully.
  }

  const typedVenue: Venue = {
    ...(venue as unknown as Omit<Venue, 'hasStripeKey'>),
    hasStripeKey,
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

  // Compute analytics data if the feature is enabled
  let analyticsData: Record<DateRange, AnalyticsData> | null = null

  if (hasFeature(typedVenue, 'analytics')) {
    const { data: orders } = await supabase
      .from('orders')
      .select('created_at, fulfillment')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('menu_item_id, quantity, created_at, order:orders!inner(venue_id)')
      .eq('order.venue_id', venueId)

    // Build item name map
    const itemNameMap = new Map<string, string>()
    for (const mi of menuItems ?? []) {
      const item = mi as unknown as { id: string; name: string }
      itemNameMap.set(item.id, item.name)
    }

    const allOrders = (orders ?? []) as { created_at: string; fulfillment: string }[]
    const allItems = (orderItems ?? []) as { menu_item_id: string; quantity: number; created_at: string }[]

    analyticsData = {
      '7d': computeAnalytics(allOrders, allItems, itemNameMap, 7),
      '30d': computeAnalytics(allOrders, allItems, itemNameMap, 30),
      'all': computeAnalytics(allOrders, allItems, itemNameMap, null),
    }
  }

  return (
    <AdminDashboard
      venue={typedVenue}
      requests={(menuItems ?? []) as unknown as RequestWithModifiers[]}
      categories={(categories ?? []) as unknown as Category[]}
      activeTab={tab}
      analyticsData={analyticsData}
    />
  )
}
