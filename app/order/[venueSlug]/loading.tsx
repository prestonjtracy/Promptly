export default function OrderLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ background: '#faf7f2', maxWidth: 430, margin: '0 auto', boxShadow: '0 1px 40px rgba(0,0,0,0.06)' }}
    >
      {/* Header skeleton */}
      <div
        className="flex items-center gap-3.5 px-5 py-3.5"
        style={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #2d5a3f 100%)', borderBottom: '3px solid #c9a84c' }}
      >
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="flex-1">
          <div className="h-5 w-36 rounded animate-pulse mb-1.5" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>
      {/* Tab skeleton */}
      <div className="flex gap-4 px-4 py-3.5" style={{ background: '#1a3d2b' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      {/* Card skeletons */}
      <div className="px-4 py-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 animate-pulse"
            style={{ background: '#fff', border: '1px solid #f0ebe0' }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="h-4 w-32 rounded mb-2" style={{ background: '#f0ebe0' }} />
                <div className="h-3 w-48 rounded mb-2" style={{ background: '#f0ebe0' }} />
                <div className="h-4 w-12 rounded" style={{ background: '#f0ebe0' }} />
              </div>
              <div className="h-10 w-[70px] rounded-lg" style={{ background: '#f0ebe0' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
