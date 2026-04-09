import Link from 'next/link'

export default function OrderNotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#faf7f2', fontFamily: "'Georgia', serif" }}
    >
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1a3d2b' }}>
          QR Code Not Recognized
        </h1>
        <p className="text-base mb-6" style={{ color: '#6b7280', fontFamily: 'Arial, sans-serif' }}>
          This QR code isn&apos;t linked to an active venue. Please check
          that you scanned a valid code.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 text-white rounded-lg font-medium"
          style={{ background: '#1a3d2b' }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
