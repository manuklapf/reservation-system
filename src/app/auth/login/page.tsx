'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'
import Button from '@/components/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const { messages } = useI18n()
  const router = useRouter()
  const t = messages.login

  // Show setup message if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {t.setupRequired}
            </h2>
            <div className="mt-4 p-6 bg-warning-soft border border-warning/45 rounded-md">
              <h3 className="text-lg font-medium text-warning-ink mb-2">
                {t.supabaseMissing}
              </h3>
              <p className="text-sm text-warning-ink mb-4">
                {t.setupDescription}
              </p>
              <div className="text-left text-sm text-warning-ink space-y-2">
                <p>
                  <strong>{t.steps}</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    {t.createProject}{' '}
                    <a
                      href="https://supabase.com"
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      supabase.com
                    </a>
                  </li>
                  <li>{t.copyEnv}</li>
                  <li>{t.addUrlAndKey}</li>
                  <li>{t.runSchema}</li>
                  <li>{t.restartDevServer}</li>
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
            {t.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">{t.subtitle}</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                {t.emailAddress}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-accent-strong focus:border-accent-strong focus:z-10 sm:text-sm"
                placeholder={t.emailAddress}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-accent-strong focus:border-accent-strong focus:z-10 sm:text-sm"
                placeholder={t.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-danger-ink text-sm text-center">{error}</div>
          )}

          <div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t.signingIn : t.signIn}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
