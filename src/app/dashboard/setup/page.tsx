'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useI18n } from '@/contexts/I18nContext'

export default function TableSetupPage() {
  const { user, tenantId } = useAuth()
  const { messages } = useI18n()
  const t = messages.setupPage
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && tenantId) {
      setLoading(false)
    }
  }, [user, tenantId])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t.loginRequired}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.backToDashboard}
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <p className="text-gray-600">
            Setup complete. Visit the dashboard to manage your restaurant.
          </p>
        </div>
      </div>
    </div>
  )
}
