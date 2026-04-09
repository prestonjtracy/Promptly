import Link from 'next/link'

export default function OrderNotFound() {
  return (
    <div className="min-h-dvh bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1.5">Link not recognized</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          This QR code isn&apos;t linked to an active venue. Please try scanning again.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center px-5 bg-gray-900 text-white text-sm font-medium rounded-full no-underline hover:bg-gray-800 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
