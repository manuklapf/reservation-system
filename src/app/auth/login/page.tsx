'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  // Show setup message if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Setup Required
            </h2>
            <div className="mt-4 p-6 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">
                Supabase Configuration Missing
              </h3>
              <p className="text-sm text-yellow-700 mb-4">
                To use this application, you need to set up your Supabase
                project and environment variables.
              </p>
              <div className="text-left text-sm text-yellow-700 space-y-2">
                <p>
                  <strong>Steps:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Create a Supabase project at{' '}
                    <a
                      href="https://supabase.com"
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      supabase.com
                    </a>
                  </li>
                  <li>
                    Copy{' '}
                    <code className="bg-yellow-100 px-1 rounded">
                      .env.example
                    </code>{' '}
                    to{' '}
                    <code className="bg-yellow-100 px-1 rounded">
                      .env.local
                    </code>
                  </li>
                  <li>
                    Add your Supabase URL and API key to{' '}
                    <code className="bg-yellow-100 px-1 rounded">
                      .env.local
                    </code>
                  </li>
                  <li>
                    Run the SQL schema from{' '}
                    <code className="bg-yellow-100 px-1 rounded">
                      supabase-schema.sql
                    </code>
                  </li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Staff Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access the reservation system
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
