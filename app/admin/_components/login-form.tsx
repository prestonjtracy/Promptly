'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithPasscode } from '@/app/actions/admin'

export function LoginForm() {
  const [slug, setSlug] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim() || !passcode.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await loginWithPasscode(slug.trim(), passcode.trim())
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/admin')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
          Venue Slug
        </label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. sunset-golf"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none transition-colors"
          autoComplete="username"
        />
      </div>
      <div>
        <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-1">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Enter passcode"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none transition-colors"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  )
}
