'use client'

export default function OrderError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something Went Wrong
        </h1>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
