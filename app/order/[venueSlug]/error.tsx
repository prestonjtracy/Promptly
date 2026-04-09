'use client'

export default function OrderError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#faf7f2', fontFamily: "'Georgia', 'Times New Roman', serif", maxWidth: 430, margin: '0 auto', boxShadow: '0 1px 40px rgba(0,0,0,0.06)' }}
    >
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1a3d2b' }}>
          Something Went Wrong
        </h1>
        <p className="mb-6" style={{ color: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 text-white rounded-lg font-medium cursor-pointer"
          style={{ background: '#1a3d2b', border: 'none', borderBottom: '2px solid #c9a84c' }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
