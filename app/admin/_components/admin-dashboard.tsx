'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { Venue, MenuItemWithModifiers, MenuCategory } from '@/lib/supabase/types'
import { logout } from '@/app/actions/admin'
import { RequestManager } from './request-manager'
import { WorkspaceSettings } from './workspace-settings'

type AdminDashboardProps = {
  venue: Venue
  requests: MenuItemWithModifiers[]
  categories: MenuCategory[]
  activeTab: string
}

export function AdminDashboard({
  venue,
  requests,
  categories,
  activeTab,
}: AdminDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
        {activeTab === 'requests' ? (
          <RequestManager
            venue={venue}
            requests={requests}
            categories={categories}
          />
        ) : (
          <WorkspaceSettings venue={venue} />
        )}
      </main>
    </div>
  )
}
