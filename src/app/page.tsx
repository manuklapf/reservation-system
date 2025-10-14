import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  // Show setup message if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              Restaurant Reservation System
            </h1>
            <div className="max-w-2xl mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-md">
              <h2 className="text-2xl font-semibold text-yellow-800 mb-4">
                Setup Required
              </h2>
              <p className="text-yellow-700 mb-4">
                To get started, you need to configure your Supabase project.
              </p>
              <div className="text-left text-sm text-yellow-700 space-y-2">
                <p><strong>Quick Setup:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Create a Supabase project at <a href="https://supabase.com" className="underline" target="_blank" rel="noopener noreferrer">supabase.com</a></li>
                  <li>Copy <code className="bg-yellow-100 px-1 rounded">.env.example</code> to <code className="bg-yellow-100 px-1 rounded">.env.local</code></li>
                  <li>Add your Supabase credentials to <code className="bg-yellow-100 px-1 rounded">.env.local</code></li>
                  <li>Run the SQL schema from <code className="bg-yellow-100 px-1 rounded">supabase-schema.sql</code></li>
                  <li>Restart the server with <code className="bg-yellow-100 px-1 rounded">npm run dev</code></li>
                </ol>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  📖 See <strong>README.md</strong> for detailed setup instructions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Restaurant Reservation System
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Manage your restaurant reservations efficiently
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-4">Staff Dashboard</h2>
              <p className="text-gray-600 mb-6">
                Access the full reservation management system for staff members
              </p>
              <Link
                href="/auth/login"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                Staff Login
              </Link>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-4">Embeddable Widget</h2>
              <p className="text-gray-600 mb-6">
                Embed reservations in your website using tenant-specific URLs
              </p>
              <div className="bg-gray-100 p-4 rounded-md">
                <code className="text-sm text-gray-800">
                  /[tenant-slug] - Your embeddable reservation view
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}