import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/app/actions/super-admin'
import { createServiceClient } from '@/lib/supabase/service'
import { SuperAdminHeader } from './_components/header'

export const metadata = {
  title: 'Super Admin — Promptly',
  robots: 'noindex, nofollow',
}

type VenueRow = {
  id: string
  name: string
  slug: string
  tier: string
}

export default async function SuperAdminHome() {
  if (!(await isSuperAdmin())) {
    redirect('/super-admin/login')
  }

  const supabase = createServiceClient()
  const { data: venueRows } = await supabase
    .from('venues')
    .select('id, name, slug, tier')
    .order('name')

  const venues = (venueRows ?? []) as VenueRow[]

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminHeader />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Venues</h2>

        {venues.length === 0 ? (
          <p className="text-sm text-gray-500">No venues yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
            {venues.map((v) => (
              <Link
                key={v.id}
                href={`/super-admin/${v.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{v.name}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">{v.slug}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded uppercase tracking-wide">
                    {v.tier}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
