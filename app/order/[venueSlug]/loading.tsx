export default function OrderLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      <div className="animate-pulse h-20 w-full" style={{ background: '#1a3d2b' }} />
      <div className="animate-pulse h-10 w-full" style={{ background: '#2d5a3f' }} />
      <div className="max-w-[430px] mx-auto px-4 py-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    </div>
  )
}
