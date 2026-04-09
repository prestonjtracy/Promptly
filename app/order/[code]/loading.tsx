export default function OrderLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="bg-gray-200 animate-pulse h-20 w-full" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Location badge skeleton */}
        <div className="h-10 bg-gray-200 animate-pulse rounded-lg w-48 mx-auto" />

        {/* Menu item skeletons */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-gray-200 animate-pulse rounded-xl"
          />
        ))}
      </div>
    </div>
  )
}
