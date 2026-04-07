'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/contexts/I18nContext'

export default function HomePage() {
  const { messages } = useI18n()
  const t = messages.home

  // Show setup message if Supabase is not configured
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">{t.title}</h1>
            <div className="max-w-2xl mx-auto p-6 bg-yellow-50 border border-yellow-200 rounded-md">
              <h2 className="text-2xl font-semibold text-yellow-800 mb-4">
                {t.setupRequired}
              </h2>
              <p className="text-yellow-700 mb-4">{t.setupDescription}</p>
              <div className="text-left text-sm text-yellow-700 space-y-2">
                <p>
                  <strong>{t.quickSetup}</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    {t.createSupabaseProject}{' '}
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
                  <li>{t.addCredentials}</li>
                  <li>{t.runSchema}</li>
                  <li>{t.restartServer}</li>
                </ol>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">{t.readme}</p>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{t.title}</h1>
          <p className="text-xl text-gray-600 mb-12">{t.subtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-4">
                {t.staffDashboard}
              </h2>
              <p className="text-gray-600 mb-6">
                {t.staffDashboardDescription}
              </p>
              <Link
                href="/auth/login"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                {t.staffLogin}
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-4">{t.widgetTitle}</h2>
              <p className="text-gray-600 mb-6">{t.widgetDescription}</p>
              <div className="bg-gray-100 p-4 rounded-md">
                <code className="text-sm text-gray-800">{t.widgetExample}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
