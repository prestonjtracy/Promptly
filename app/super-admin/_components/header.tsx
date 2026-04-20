'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { logoutSuperAdmin } from '@/app/actions/super-admin'

export function SuperAdminHeader() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logoutSuperAdmin()
      router.push('/super-admin/login')
    })
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/super-admin" className="block">
          <h1 className="text-base font-bold text-gray-900">Promptly</h1>
          <p className="text-xs text-gray-500">Platform admin</p>
        </Link>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          Log Out
        </button>
      </div>
    </header>
  )
}
