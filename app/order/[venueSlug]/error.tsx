'use client'

export default function OrderError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-dvh bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1.5">Something went wrong</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex h-10 items-center px-5 bg-gray-900 text-white text-sm font-medium rounded-full border-0 cursor-pointer hover:bg-gray-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
