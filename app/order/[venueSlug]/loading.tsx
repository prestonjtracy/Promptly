export default function OrderLoading() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="max-w-lg mx-auto">
        {/* Header skeleton */}
        <div className="px-4 py-3.5 border-b border-gray-100">
          <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        {/* Tab skeleton */}
        <div className="flex gap-4 px-4 py-2.5 border-b border-gray-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        {/* Card skeletons */}
        <div className="px-4 pt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex justify-between">
                <div className="flex-1">
                  <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-44 bg-gray-100 rounded animate-pulse mt-2" />
                  <div className="h-4 w-14 bg-gray-100 rounded animate-pulse mt-3" />
                </div>
                <div className="h-9 w-16 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
