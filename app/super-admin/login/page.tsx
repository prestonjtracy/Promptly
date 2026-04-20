import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/app/actions/super-admin'
import { SuperAdminLoginForm } from './_components/login-form'

export const metadata = {
  title: 'Super Admin — Promptly',
  robots: 'noindex, nofollow',
}

export default async function SuperAdminLoginPage() {
  if (await isSuperAdmin()) {
    redirect('/super-admin')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Promptly</h1>
          <p className="text-gray-500 mt-1 text-sm">Platform administration</p>
        </div>
        <SuperAdminLoginForm />
      </div>
    </div>
  )
}
