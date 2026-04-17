export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-gray-50 px-4">
      <main className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Promptly</h1>
        <p className="text-lg text-gray-600 mb-8">
          Instant service requests. Scan a QR code, select what you need, and
          get served.
        </p>
        <p className="text-sm text-gray-400">
          Scan a QR code at your location to get started.
        </p>
      </main>
    </div>
  );
}
