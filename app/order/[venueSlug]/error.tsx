'use client'

export default function OrderError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: '#F8F7F5', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-2">Something went wrong</h1>
        <p className="text-[14px] text-gray-400 mb-8 leading-relaxed">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex h-11 items-center px-6 bg-gray-900 text-white text-[13px] font-semibold rounded-full border-0 cursor-pointer transition-colors hover:bg-gray-800"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
