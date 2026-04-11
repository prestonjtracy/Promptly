'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { Venue, RequestWithModifiers, Category } from '@/lib/supabase/types'
import { hasFeature } from '@/lib/features'
import { logout } from '@/app/actions/admin'
import { RequestManager } from './request-manager'
import { WorkspaceSettings } from './workspace-settings'
import { Analytics, type AnalyticsData } from './analytics'

type DateRange = '7d' | '30d' | 'all'

type AdminDashboardProps = {
  venue: Venue
  requests: RequestWithModifiers[]
  categories: Category[]
  activeTab: string
  analyticsData: Record<DateRange, AnalyticsData> | null
}

export function AdminDashboard({
  venue,
  requests,
  categories,
  activeTab,
  analyticsData,
}: AdminDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const analyticsEnabled = hasFeature(venue, 'analytics')

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
      router.push('/admin/login')
    })
  }

  const switchTab = (tab: string) => {
    router.push(`/admin?tab=${tab}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{venue.name}</h1>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="hover-btn text-sm text-gray-500"
          >
            Log Out
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => switchTab('requests')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'requests'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Requests
          </button>
          {analyticsEnabled && (
            <button
              onClick={() => switchTab('analytics')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Analytics
            </button>
          )}
          <button
            onClick={() => switchTab('internal')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'internal'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Internal
          </button>
          <button
            onClick={() => switchTab('workspace')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'workspace'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Workspace
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'analytics' && analyticsEnabled && analyticsData ? (
          <Analytics data={analyticsData} />
        ) : activeTab === 'internal' ? (
          <RequestManager
            venue={venue}
            requests={requests.filter(
              (r) => r.internal_only || (r.internal_notes && r.internal_notes.trim() !== '')
            )}
            categories={categories}
            internalView
          />
        ) : activeTab === 'workspace' ? (
          <WorkspaceSettings venue={venue} />
        ) : (
          <RequestManager
            venue={venue}
            requests={requests}
            categories={categories}
          />
        )}
      </main>
    </div>
  )
}
