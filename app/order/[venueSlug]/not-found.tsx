import Link from 'next/link'

export default function OrderNotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: '#F8F7F5', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-white shadow-sm shadow-black/[0.04] flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-2">Link not recognized</h1>
        <p className="text-[14px] text-gray-400 mb-8 leading-relaxed">
          This QR code isn&apos;t linked to an active venue. Please try scanning again.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center px-6 bg-gray-900 text-white text-[13px] font-semibold rounded-full no-underline transition-colors hover:bg-gray-800"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
