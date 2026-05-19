import Link from 'next/link'

export default function ThanksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
      <div className="max-w-md w-full text-center px-4">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Thank You!
        </h1>

        <p className="text-gray-600 mb-8">
          Your information has been received. We'll review your request and get back to you soon.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-700">
            <strong>What's next?</strong> You'll receive a confirmation email shortly.
          </p>
        </div>

        <Link
          href="/"
          className="btn-primary inline-block"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
