import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isSuperAdmin } from '@/app/actions/super-admin'
import { createServiceClient } from '@/lib/supabase/service'
import type { VenueFeatures } from '@/lib/supabase/types'
import { SuperAdminHeader } from '../_components/header'
import { VenueFlagEditor } from './_components/venue-flag-editor'

export const metadata = {
  title: 'Super Admin — Promptly',
  robots: 'noindex, nofollow',
}

type VenueRow = {
  id: string
  name: string
  slug: string
  tier: string
  features: VenueFeatures | null
}

export default async function SuperAdminVenuePage(
  props: PageProps<'/super-admin/[venueId]'>,
) {
  if (!(await isSuperAdmin())) {
    redirect('/super-admin/login')
  }

  const { venueId } = await props.params

  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('venues')
    .select('id, name, slug, tier, features')
    .eq('id', venueId)
    .maybeSingle()

  if (!row) notFound()
  const venue = row as VenueRow

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminHeader />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          All venues
        </Link>

        <div>
          <h2 className="text-xl font-bold text-gray-900">{venue.name}</h2>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{venue.slug}</p>
        </div>

        <VenueFlagEditor
          venueId={venue.id}
          initialFeatures={venue.features ?? {}}
          initialTier={venue.tier}
        />
      </main>
    </div>
  )
}
