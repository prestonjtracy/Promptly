export default function OrderLoading() {
  return (
    <div className="min-h-dvh" style={{ background: '#F8F7F5', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div className="max-w-lg mx-auto">
        <div className="px-5 py-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white animate-pulse" />
            <div>
              <div className="h-5 w-36 bg-white rounded-lg animate-pulse" />
              <div className="h-3 w-24 bg-white rounded-lg animate-pulse mt-2" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-white rounded-full animate-pulse" />
          ))}
        </div>
        <div className="px-5 pt-3 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm shadow-black/[0.04]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-3 w-48 bg-gray-100 rounded-lg animate-pulse mt-2.5" />
                  <div className="h-4 w-14 bg-gray-100 rounded-lg animate-pulse mt-3" />
                </div>
                <div className="h-10 w-[72px] bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
