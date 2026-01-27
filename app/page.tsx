export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4">
          Email Prototype
        </h1>
        <p className="text-gray-600 mb-8">
          Connect your Gmail to get started
        </p>
        <a
          href="/api/auth/authorize"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Connect Gmail
        </a>
      </div>
    </main>
  )
}
